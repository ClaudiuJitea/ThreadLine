import { SearchProvider, RawSearchResult } from "./types";

export class TavilyApiKeyMissingError extends Error {
  constructor() {
    super("Tavily API key is not configured on the server.");
    this.name = "TavilyApiKeyMissingError";
  }
}

export class TavilySearchError extends Error {
  statusCode?: number;
  isTimeout?: boolean;
  isRateLimit?: boolean;

  constructor(
    message: string,
    options?: { statusCode?: number; isTimeout?: boolean; isRateLimit?: boolean }
  ) {
    super(message);
    this.name = "TavilySearchError";
    this.statusCode = options?.statusCode;
    this.isTimeout = options?.isTimeout;
    this.isRateLimit = options?.isRateLimit;
  }
}

interface TavilyApiResponseItem {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
}

interface TavilyApiResponse {
  results?: TavilyApiResponseItem[];
  error?: string;
  detail?: { error?: string } | string;
}

export class TavilySearchProvider implements SearchProvider {
  readonly name = "Tavily";
  private readonly defaultTimeoutMs: number;

  constructor(timeoutMs = 8000) {
    this.defaultTimeoutMs = timeoutMs;
  }

  async search(query: string, callerSignal?: AbortSignal): Promise<RawSearchResult[]> {
    const apiKey = process.env.TAVILY_API_KEY?.trim();
    if (!apiKey) {
      throw new TavilyApiKeyMissingError();
    }

    const trimmedQuery = query.trim().slice(0, 400);
    if (!trimmedQuery) {
      return [];
    }

    // Set up internal timeout controller linked to caller's abort signal
    const controller = new AbortController();
    let isTimedOut = false;

    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, this.defaultTimeoutMs);

    const onCallerAbort = () => {
      controller.abort();
    };

    if (callerSignal) {
      callerSignal.addEventListener("abort", onCallerAbort, { once: true });
    }

    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: trimmedQuery,
          search_depth: "basic",
          max_results: 5,
          include_answer: false,
          include_raw_content: false,
          include_images: false,
          auto_parameters: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new TavilySearchError("Authentication failed with Tavily search provider.", {
            statusCode: response.status,
          });
        }

        if (response.status === 429) {
          throw new TavilySearchError(
            "Tavily search rate limit or monthly credit quota reached.",
            { statusCode: 429, isRateLimit: true }
          );
        }

        let errorDetail = `Tavily returned HTTP ${response.status}`;
        try {
          const errData: TavilyApiResponse = await response.json();
          if (typeof errData.detail === "string") {
            errorDetail = errData.detail;
          } else if (errData.detail?.error) {
            errorDetail = errData.detail.error;
          } else if (errData.error) {
            errorDetail = errData.error;
          }
        } catch {
          // Keep generic detail
        }

        throw new TavilySearchError(`Search provider error: ${errorDetail}`, {
          statusCode: response.status,
        });
      }

      const data: TavilyApiResponse = await response.json();
      const rawResults = data.results;

      if (!Array.isArray(rawResults)) {
        return [];
      }

      return rawResults
        .filter((item): item is TavilyApiResponseItem & { url: string; title: string } =>
          Boolean(item.url && item.title)
        )
        .map((item) => ({
          title: String(item.title).trim(),
          url: String(item.url).trim(),
          content: String(item.content || "").trim(),
        }));
    } catch (err: unknown) {
      if (callerSignal?.aborted) {
        throw new Error("Client cancelled request.");
      }

      if (isTimedOut) {
        throw new TavilySearchError("Tavily search request timed out.", {
          isTimeout: true,
        });
      }

      if (err instanceof TavilySearchError || err instanceof TavilyApiKeyMissingError) {
        throw err;
      }

      const message = err instanceof Error ? err.message : String(err);
      throw new TavilySearchError(`Failed to connect to search provider: ${message}`);
    } finally {
      clearTimeout(timeoutId);
      if (callerSignal) {
        callerSignal.removeEventListener("abort", onCallerAbort);
      }
    }
  }
}
