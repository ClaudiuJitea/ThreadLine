import { AllowedModelId, ModelOption } from "./types";

export const ALLOWED_MODELS: readonly ModelOption[] = [
  {
    id: "openai/gpt-6-luna",
    name: "GPT-6 Luna",
    provider: "OpenAI",
    description: "Next-gen flagship intelligence, deep reasoning, and multimodal capabilities",
    supportsImages: true,
    badge: "Flagship",
    supportsReasoning: true,
    nativeReasoning: false,
    reasoningEfforts: ["low", "medium", "high", "none"],
    reasoningNote: "Full reasoning control. Supports Low/Med/High effort or can be toggled completely Off.",
  },
  {
    id: "xiaomi/mimo-v2.6-flash",
    name: "MiMo v2.6 Flash",
    provider: "Xiaomi",
    description: "High-speed multimodal conversational model optimized for rapid response",
    supportsImages: true,
    badge: "Fast Vision",
    supportsReasoning: true,
    nativeReasoning: true,
    reasoningEfforts: ["low", "medium", "high", "none"],
    reasoningNote: "Native reasoning model. 'Think: Off' excludes and suppresses thinking tokens for direct output.",
  },
  {
    id: "z-ai/glm-5.3-flash",
    name: "GLM-5.3 Flash",
    provider: "Zhipu AI",
    description: "Efficient bilingual high-throughput agent with strong general reasoning",
    supportsImages: false,
    badge: "Throughput",
    supportsReasoning: true,
    nativeReasoning: false,
    reasoningEfforts: ["low", "medium", "high", "none"],
    reasoningNote: "Supports selectable reasoning effort (Low/Med/High) or completely Off.",
  },
  {
    id: "deepseek/deepseek-v4.1-flash",
    name: "DeepSeek v4.1 Flash",
    provider: "DeepSeek",
    description: "High-performance code generation, math, and analytical problem solving",
    supportsImages: false,
    badge: "Code & Logic",
    supportsReasoning: true,
    nativeReasoning: false,
    reasoningEfforts: ["low", "medium", "high", "none"],
    reasoningNote: "Supports selectable reasoning effort (Low/Med/High) or completely Off.",
  },
  {
    id: "recraft/recraft-v4.1-flash",
    name: "Recraft V4.1 Flash",
    provider: "Recraft",
    description: "High-speed text-to-image generator producing ~1K raster images in ~1.5s",
    supportsImages: false,
    badge: "Image Gen",
    isImageGenerator: true,
    supportsReasoning: false,
    supportedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    reasoningNote: "Image generation model. Reasoning controls do not apply.",
  },
] as const;

export const TRANSLATION_MODEL_ID: AllowedModelId = "google/gemma-4-26b-a4b-it";

export const TRANSLATION_MODEL_INFO: ModelOption = {
  id: TRANSLATION_MODEL_ID,
  name: "Gemma 4 26B",
  provider: "Google",
  description: "Dedicated high-accuracy translation model powered by Google Gemma 4 26B",
  supportsImages: false,
  badge: "Translate",
  supportsReasoning: false,
  reasoningNote: "Dedicated translation model. Reasoning is disabled for direct translation.",
};

export const ALLOWED_MODEL_IDS: ReadonlySet<string> = new Set([
  ...ALLOWED_MODELS.map((m) => m.id),
  TRANSLATION_MODEL_ID,
]);

export function isAllowedModel(modelId: string): modelId is AllowedModelId {
  return ALLOWED_MODEL_IDS.has(modelId);
}

export function isImageGeneratorModel(modelId: string): boolean {
  const model = ALLOWED_MODELS.find((m) => m.id === modelId);
  return Boolean(model?.isImageGenerator);
}

export function isTranslationModel(modelId: string): boolean {
  return modelId === TRANSLATION_MODEL_ID;
}

export function getModelInfo(modelId: string): ModelOption {
  if (modelId === TRANSLATION_MODEL_ID) {
    return TRANSLATION_MODEL_INFO;
  }
  const model = ALLOWED_MODELS.find((m) => m.id === modelId);
  if (!model) {
    return ALLOWED_MODELS[0];
  }
  return model;
}

export const DEFAULT_MODEL_ID: AllowedModelId = "openai/gpt-6-luna";
