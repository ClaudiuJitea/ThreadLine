import { NextResponse } from "next/server";
import { getOpenRouterKey, verifySameOrigin, verifySessionFromRequest } from "@/lib/auth";
import { isAllowedModel, isImageGeneratorModel, isTranslationModel, TRANSLATION_MODEL_ID } from "@/lib/models";
import { ChatRequestBody } from "@/lib/types";
import { getTextToImagePrompt } from "@/lib/image-generation";
import { buildTranslationSystemPrompt } from "@/lib/translate";
import {
  executeWebSearch,
  formatSourcesForOpenRouterPrompt,
  TavilyApiKeyMissingError,
  TavilySearchError,
  SearchExecutionResult,
} from "@/lib/search";

// Maximum allowable request body size for Vercel Hobby (2.5MB safety margin)
const MAX_REQUEST_BYTES = 2.5 * 1024 * 1024;

export async function POST(request: Request) {
  // 1. CSRF same-origin check
  if (!verifySameOrigin(request)) {
    return NextResponse.json(
      { error: "Forbidden: Cross-site request rejected" },
      { status: 403 }
    );
  }

  // 2. CRITICAL: Validate session independently inside route handler BEFORE calling OpenRouter
  // A missing, altered, or expired session must NEVER trigger an OpenRouter call.
  const isAuthenticated = await verifySessionFromRequest(request);
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized: A valid session is required" },
      { status: 401 }
    );
  }

  // 3. Fail closed if OPENROUTER_API_KEY is missing
  let openRouterKey: string;
  try {
    openRouterKey = getOpenRouterKey();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Chat Route Env Error]", message);
    return NextResponse.json(
      {
        error:
          "Server configuration error: OPENROUTER_API_KEY is not configured.",
      },
      { status: 500 }
    );
  }

  // 4. Request size check
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_BYTES) {
    return NextResponse.json(
      {
        error: `Payload too large. Request size exceeds the ${Math.round(
          MAX_REQUEST_BYTES / (1024 * 1024)
        )}MB budget for Vercel Hobby.`,
      },
      { status: 413 }
    );
  }

  // 5. Parse and validate JSON body
  let body: ChatRequestBody;
  try {
    const textBody = await request.text();
    if (new TextEncoder().encode(textBody).length > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        {
          error: "Payload too large. Request body exceeds Vercel Hobby budget.",
        },
        { status: 413 }
      );
    }
    body = JSON.parse(textBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  const { model, messages } = body;

  // 6. Strict Model Allowlist Check
  if (!model || !isAllowedModel(model)) {
    return NextResponse.json(
      {
        error: `Invalid or unauthorized model ID "${model}". Allowed models are: openai/gpt-6-luna, xiaomi/mimo-v2.6-flash, z-ai/glm-5.3-flash, deepseek/deepseek-v4.1-flash, recraft/recraft-v4.1-flash`,
      },
      { status: 400 }
    );
  }

  // 7. Validate messages structure
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "A non-empty 'messages' array is required." },
      { status: 400 }
    );
  }

  for (const msg of messages) {
    if (!msg.role || !["user", "assistant", "system"].includes(msg.role)) {
      return NextResponse.json(
        { error: "Invalid message role in history." },
        { status: 400 }
      );
    }
    if (msg.content === undefined || msg.content === null) {
      return NextResponse.json(
        { error: "Message content cannot be null or undefined." },
        { status: 400 }
      );
    }
  }

  // 8. Handle Image Generator Models (e.g. Recraft V4.1 Flash via dedicated OpenRouter Images API)
  if (isImageGeneratorModel(model)) {
    const textToImage = getTextToImagePrompt(messages);
    if (textToImage.error) {
      return NextResponse.json(
        { error: textToImage.error },
        { status: 400 }
      );
    }
    const latestUserPrompt = textToImage.prompt;

    const validAspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];
    const requestedAspectRatio = body.aspectRatio || "1:1";
    const aspectRatio = validAspectRatios.includes(requestedAspectRatio)
      ? requestedAspectRatio
      : "1:1";

    try {
      const openRouterResponse = await fetch(
        "https://openrouter.ai/api/v1/images",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer":
              request.headers.get("origin") || "https://threadline.vercel.app",
            "X-Title": "ThreadLine",
          },
          body: JSON.stringify({
            model,
            prompt: latestUserPrompt,
            aspect_ratio: aspectRatio,
            n: 1,
          }),
          signal: request.signal,
        }
      );

      if (!openRouterResponse.ok) {
        let errorDetail = `OpenRouter image API responded with status ${openRouterResponse.status}`;
        try {
          const errorJson = await openRouterResponse.json();
          if (errorJson.error?.message) {
            errorDetail = errorJson.error.message;
          } else if (typeof errorJson.error === "string") {
            errorDetail = errorJson.error;
          }
        } catch {
          const text = await openRouterResponse.text().catch(() => "");
          if (text) errorDetail = text;
        }

        console.error(
          `[OpenRouter Image Error ${openRouterResponse.status} for ${model}]:`,
          errorDetail
        );

        return NextResponse.json(
          {
            error: errorDetail,
            providerStatus: openRouterResponse.status,
            model,
          },
          {
            status:
              openRouterResponse.status >= 500 ? 502 : openRouterResponse.status,
          }
        );
      }

      const responseJson = await openRouterResponse.json();
      const firstItem = responseJson.data?.[0];
      let imageUrl = "";
      if (firstItem?.url) {
        imageUrl = firstItem.url;
      } else if (firstItem?.b64_json) {
        imageUrl = firstItem.b64_json.startsWith("data:")
          ? firstItem.b64_json
          : `data:image/png;base64,${firstItem.b64_json}`;
      }

      if (!imageUrl) {
        return NextResponse.json(
          { error: "No image was returned by OpenRouter." },
          { status: 502 }
        );
      }

      const encoder = new TextEncoder();
      const imageId = `img_gen_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 7)}`;
      const generatedImageData = {
        id: imageId,
        url: imageUrl,
        prompt: latestUserPrompt,
        aspectRatio,
        createdAt: Date.now(),
      };

      const ssePayload = [
        `data: ${JSON.stringify({
          type: "image_generated",
          image: generatedImageData,
        })}\n\n`,
        `data: ${JSON.stringify({
          choices: [
            {
              delta: {
                content: `Generated with **Recraft V4.1 Flash** (${aspectRatio}):\n\n![${latestUserPrompt}](${imageUrl})`,
              },
            },
          ],
        })}\n\n`,
        `data: [DONE]\n\n`,
      ];

      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of ssePayload) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[OpenRouter Image Fetch Exception]", message);
      return NextResponse.json(
        {
          error:
            "Failed to generate image with OpenRouter API. Please try again.",
          details: process.env.NODE_ENV !== "production" ? message : undefined,
        },
        { status: 500 }
      );
    }
  }

  // 9. Translation & Web Search Execution
  const isTranslation =
    Boolean(body.translation?.enabled) || isTranslationModel(model);
  const targetModel = isTranslation ? TRANSLATION_MODEL_ID : model;

  const isWebSearch = !isTranslation && Boolean(body.webSearch);
  let searchResult: SearchExecutionResult | null = null;

  if (isWebSearch) {
    // Derive search query strictly from the latest user message
    let latestUserPrompt = "";
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        const content = messages[i].content;
        if (typeof content === "string") {
          latestUserPrompt = content.trim();
        } else if (Array.isArray(content)) {
          for (const part of content) {
            if (part.type === "text" && part.text) {
              latestUserPrompt += (latestUserPrompt ? " " : "") + part.text.trim();
            }
          }
        }
        break;
      }
    }

    try {
      searchResult = await executeWebSearch(latestUserPrompt, request.signal);
    } catch (err: unknown) {
      if (err instanceof TavilyApiKeyMissingError) {
        return NextResponse.json(
          {
            error:
              "Web search is currently unavailable. The Tavily API key is not configured on the server. Disable 'Search the web' to continue in standard chat mode.",
            code: "WEB_SEARCH_KEY_MISSING",
          },
          { status: 503 }
        );
      }
      if (err instanceof TavilySearchError) {
        return NextResponse.json(
          {
            error: `Web search failed: ${err.message}. You can try again or disable 'Search the web' for standard chat.`,
            code: "WEB_SEARCH_PROVIDER_ERROR",
          },
          {
            status:
              err.statusCode && err.statusCode >= 400 && err.statusCode < 500
                ? 502
                : 503,
          }
        );
      }
      const msg = err instanceof Error ? err.message : "Search error";
      return NextResponse.json(
        {
          error: `Web search encountered an unexpected error: ${msg}. You can try again or disable 'Search the web'.`,
          code: "WEB_SEARCH_ERROR",
        },
        { status: 502 }
      );
    }
  }

  // 10. Prepare messages for OpenRouter (Translation, Web Search, or Standard)
  let outgoingMessages = messages;
  if (isTranslation) {
    let latestUserPrompt = "";
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        const content = messages[i].content;
        if (typeof content === "string") {
          latestUserPrompt = content.trim();
        } else if (Array.isArray(content)) {
          for (const part of content) {
            if (part.type === "text" && part.text) {
              latestUserPrompt += (latestUserPrompt ? " " : "") + part.text.trim();
            }
          }
        }
        break;
      }
    }

    if (!latestUserPrompt) {
      return NextResponse.json(
        { error: "A non-empty text prompt is required for translation." },
        { status: 400 }
      );
    }

    const source = body.translation?.source || "auto";
    const target = body.translation?.target || "en";
    const translationPrompt = buildTranslationSystemPrompt(source, target);

    outgoingMessages = [
      { role: "system", content: translationPrompt },
      { role: "user", content: latestUserPrompt },
    ];
  } else if (isWebSearch && searchResult) {
    const webSearchInstruction = formatSourcesForOpenRouterPrompt(
      searchResult.sources,
      searchResult.noResults
    );
    outgoingMessages = [
      { role: "system", content: webSearchInstruction },
      ...messages,
    ];
  }

  // Ensure no message with completely empty content is sent to OpenRouter
  outgoingMessages = outgoingMessages.filter((msg) => {
    if (typeof msg.content === "string") {
      return msg.content.trim().length > 0;
    }
    if (Array.isArray(msg.content)) {
      return msg.content.length > 0;
    }
    return Boolean(msg.content);
  });

  // 11. Forward request to OpenRouter API
  try {
    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            request.headers.get("origin") || "https://threadline.vercel.app",
          "X-Title": "ThreadLine",
        },
        body: JSON.stringify({
          model: targetModel,
          messages: outgoingMessages,
          stream: true,
        }),
      }
    );

    // If OpenRouter responds with an error status, return readable error
    if (!openRouterResponse.ok) {
      let errorDetail = `OpenRouter responded with status ${openRouterResponse.status}`;
      try {
        const errorJson = await openRouterResponse.json();
        if (errorJson.error?.message) {
          errorDetail = errorJson.error.message;
        } else if (typeof errorJson.error === "string") {
          errorDetail = errorJson.error;
        }
      } catch {
        const text = await openRouterResponse.text().catch(() => "");
        if (text) errorDetail = text;
      }

      console.error(
        `[OpenRouter Error ${openRouterResponse.status} for ${targetModel}]:`,
        errorDetail
      );

      return NextResponse.json(
        {
          error: errorDetail,
          providerStatus: openRouterResponse.status,
          model: targetModel,
        },
        { status: openRouterResponse.status >= 500 ? 502 : openRouterResponse.status }
      );
    }

    if (!openRouterResponse.body) {
      return NextResponse.json(
        { error: "No response body received from OpenRouter." },
        { status: 502 }
      );
    }

    // Stream SSE to the client
    // If web search was executed, emit sources metadata event first, then pipe OpenRouter stream
    if (isWebSearch && searchResult) {
      const encoder = new TextEncoder();
      const metadataEvent = `data: ${JSON.stringify({
        type: "search_sources",
        sources: searchResult.sources,
        noResults: searchResult.noResults,
      })}\n\n`;

      const stream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(metadataEvent));

          const reader = openRouterResponse.body!.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          } catch (streamErr) {
            controller.error(streamErr);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // Standard non-web streaming
    return new Response(openRouterResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[OpenRouter Fetch Exception]", message);
    return NextResponse.json(
      {
        error: "Failed to communicate with OpenRouter API. Please try again.",
        details: process.env.NODE_ENV !== "production" ? message : undefined,
      },
      { status: 500 }
    );
  }
}
