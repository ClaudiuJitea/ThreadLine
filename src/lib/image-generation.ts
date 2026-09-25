import type { ChatRequestBody } from "./types";

/** Recraft's image endpoint accepts a text prompt, never an image reference. */
export function getTextToImagePrompt(
  messages: ChatRequestBody["messages"]
): { prompt: string; error?: never } | { prompt?: never; error: string } {
  if (messages.some((message) =>
    Array.isArray(message.content) &&
    message.content.some((part) => part.type === "image_url")
  )) {
    return { error: "This image generator supports text prompts only. Remove attached images and try again." };
  }

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
  const content = latestUserMessage?.content;
  const prompt = typeof content === "string"
    ? content.trim()
    : Array.isArray(content)
      ? content.filter((part) => part.type === "text").map((part) => part.text.trim()).filter(Boolean).join(" ")
      : "";

  return prompt
    ? { prompt }
    : { error: "A non-empty text prompt is required for image generation." };
}
