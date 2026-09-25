export interface RawSearchResult {
  title: string;
  url: string;
  content: string;
}

export interface NormalizedWebSource {
  number: number;
  title: string;
  url: string;
  hostname: string;
  snippet: string;
}

export interface SearchProvider {
  readonly name: string;
  search(query: string, signal?: AbortSignal): Promise<RawSearchResult[]>;
}

export interface SearchExecutionResult {
  sources: NormalizedWebSource[];
  query: string;
  noResults: boolean;
}
