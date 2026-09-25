export type AllowedModelId =
  | "openai/gpt-6-luna"
  | "xiaomi/mimo-v2.6-flash"
  | "z-ai/glm-5.3-flash"
  | "deepseek/deepseek-v4.1-flash"
  | "recraft/recraft-v4.1-flash"
  | "google/gemma-4-26b-a4b-it";

export interface ModelOption {
  id: AllowedModelId;
  name: string;
  provider: string;
  description: string;
  supportsImages: boolean;
  badge: string;
  isImageGenerator?: boolean;
  supportedAspectRatios?: readonly string[];
}

export type MessageRole = "user" | "assistant" | "system";

export interface ImageAttachmentMetadata {
  id: string;
  name: string;
  type: string;
  size: number;
  width?: number;
  height?: number;
  // Note: base64 data URL is held in memory during the active session,
  // but stripped when serialized to localStorage to avoid exceeding browser storage quotas.
  dataUrl?: string;
  omittedFromContext?: boolean;
}

export interface WebSourceMetadata {
  number: number;
  title: string;
  url: string;
  hostname: string;
  snippet?: string;
}

export interface GeneratedImageMetadata {
  id: string;
  url: string;
  prompt: string;
  aspectRatio?: string;
  createdAt: number;
  width?: number;
  height?: number;
}

export interface TranslationMetadata {
  source: string;
  sourceName: string;
  target: string;
  targetName: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  // Record which model generated this message (for assistant messages)
  modelId?: AllowedModelId;
  modelName?: string;
  modelProvider?: string;
  // Attached image metadata
  attachments?: ImageAttachmentMetadata[];
  // If request budget pruning dropped an image from older turns
  contextWarning?: string;
  // Error state if generation failed
  isError?: boolean;
  // Optional web search metadata
  isWebSearch?: boolean;
  sources?: WebSourceMetadata[];
  // Generated images (from image generator models)
  generatedImages?: GeneratedImageMetadata[];
  // Optional translation metadata
  isTranslation?: boolean;
  translation?: TranslationMetadata;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  modelId: AllowedModelId;
  messages: ChatMessage[];
}

export interface ChatRequestBody {
  model: AllowedModelId;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content:
      | string
      | Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string } }
        >;
  }>;
  webSearch?: boolean;
  aspectRatio?: string;
  translation?: {
    enabled: boolean;
    source: string;
    target: string;
  };
}

export interface LoginResponse {
  success?: boolean;
  error?: string;
}

export interface AuthStatusResponse {
  authenticated: boolean;
}
