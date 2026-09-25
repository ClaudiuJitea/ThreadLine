import type { ChatMessage, ImageAttachmentMetadata, AllowedModelId } from "./types";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_FILE_SIZE = 15 * 1024 * 1024; // 15MB initial upload limit before compression
export const MAX_REQUEST_BUDGET_BYTES = 2.4 * 1024 * 1024; // 2.4MB Vercel Hobby safe request ceiling
const MAX_COMPRESSED_IMAGE_BYTES = 700 * 1024;

/**
 * Resizes and compresses an image in the browser using HTML5 Canvas.
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.82
): Promise<{ dataUrl: string; width: number; height: number; size: number; type: string }> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      `Unsupported image type "${file.type}". Allowed formats: JPEG, PNG, WebP.`
    );
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error("File exceeds 15MB upload limit.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image element"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not initialize 2D canvas context"));
          return;
        }

        // Draw image with smooth downsampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // WebP compresses screenshots and photos while preserving PNG transparency.
        // Limit the encoded attachment so a single upload cannot consume the whole request.
        let dataUrl = "";
        let size = 0;
        for (let attempt = 0; attempt < 8; attempt++) {
          dataUrl = canvas.toDataURL("image/webp", Math.max(0.5, quality - attempt * 0.06));
          size = Math.floor((dataUrl.split(",")[1]?.length || 0) * 3 / 4);
          if (size <= MAX_COMPRESSED_IMAGE_BYTES) break;

          width = Math.max(1, Math.round(width * 0.8));
          height = Math.max(1, Math.round(height * 0.8));
          const smaller = document.createElement("canvas");
          smaller.width = width;
          smaller.height = height;
          const smallerCtx = smaller.getContext("2d");
          if (!smallerCtx) break;
          smallerCtx.imageSmoothingQuality = "high";
          smallerCtx.drawImage(canvas, 0, 0, width, height);
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(smaller, 0, 0);
        }

        if (size > MAX_COMPRESSED_IMAGE_BYTES) {
          reject(new Error("This image is too detailed to fit the chat request. Try a smaller image."));
          return;
        }

        resolve({ dataUrl, width, height, size, type: dataUrl.slice(5, dataUrl.indexOf(";")) });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sanitizes messages before writing to browser localStorage.
 * CRITICAL REQUIREMENT: "Do not save base64 images in localStorage."
 * Retains attachment metadata while stripping heavy base64 strings.
 */
export function sanitizeMessagesForLocalStorage(
  messages: ChatMessage[]
): ChatMessage[] {
  return messages.map((msg) => {
    let sanitizedContent = msg.content;
    // Strip large base64 data URLs from markdown content for localStorage
    if (sanitizedContent && sanitizedContent.includes("data:image/")) {
      sanitizedContent = sanitizedContent.replace(
        /!\[(.*?)\]\(data:image\/[^)]+\)/g,
        "![$1]([image:cached])"
      );
    }

    const sanitizedAttachments = msg.attachments?.map((att) => ({
      id: att.id,
      name: att.name,
      type: att.type,
      size: att.size,
      width: att.width,
      height: att.height,
      dataUrl: undefined, // Strip base64 data
    }));

    const sanitizedGeneratedImages = msg.generatedImages?.map((img) => ({
      id: img.id,
      url: img.url.startsWith("data:") ? "" : img.url, // Strip heavy base64 data to protect localStorage quota
      prompt: img.prompt,
      aspectRatio: img.aspectRatio,
      createdAt: img.createdAt,
      width: img.width,
      height: img.height,
    }));

    return {
      ...msg,
      content: sanitizedContent,
      attachments: sanitizedAttachments,
      generatedImages: sanitizedGeneratedImages,
    };
  });
}

export type OpenRouterContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface OpenRouterFormattedMessage {
  role: "user" | "assistant" | "system";
  content: string | OpenRouterContentPart[];
}

/**
 * Prepares messages for OpenRouter while enforcing the Vercel Hobby request budget.
 * If total payload exceeds budget, older images are pruned from history turns
 * while preserving all conversation text and latest turn attachments.
 */
export function buildPayloadWithBudgetControl(
  history: ChatMessage[],
  currentPrompt: string,
  currentImages: ImageAttachmentMetadata[],
  options: { model: AllowedModelId; webSearch: boolean; aspectRatio: string }
): {
  payloadMessages: OpenRouterFormattedMessage[];
  droppedImageCount: number;
  droppedMessageCount: number;
  exceedsBudget: boolean;
} {
  // Format current user turn
  const currentTurnParts: OpenRouterContentPart[] = [];
  if (currentPrompt.trim().length > 0) {
    currentTurnParts.push({ type: "text", text: currentPrompt.trim() });
  }

  for (const img of currentImages) {
    if (img.dataUrl) {
      currentTurnParts.push({
        type: "image_url",
        image_url: { url: img.dataUrl },
      });
    }
  }

  // Deep clone history messages with their data URLs
  const candidateHistory = history.map((msg) => {
    const validImages = (msg.attachments || []).filter((a) => a.dataUrl);

    if (validImages.length === 0) {
      return {
        role: msg.role,
        content: msg.content,
        hasImages: false,
        imageParts: [] as OpenRouterContentPart[],
      };
    }

    const parts: OpenRouterContentPart[] = [
      { type: "text", text: msg.content || "" },
      ...validImages.map((img) => ({
        type: "image_url" as const,
        image_url: { url: img.dataUrl! },
      })),
    ];

    return {
      role: msg.role,
      content: parts,
      hasImages: true,
      imageParts: validImages,
    };
  });

  let droppedImageCount = 0;
  let droppedMessageCount = 0;

  // Function to calculate total JSON byte size
  const calculateTotalSize = (): number => {
    const allMsgs = [
      ...candidateHistory.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      {
        role: "user" as const,
        content:
          currentTurnParts.length === 1 && currentTurnParts[0].type === "text"
            ? currentTurnParts[0].text
            : currentTurnParts,
      },
    ];
    return new TextEncoder().encode(JSON.stringify({
      model: options.model,
      messages: allMsgs,
      webSearch: options.webSearch,
      aspectRatio: options.aspectRatio,
    })).length;
  };

  // If payload exceeds budget, prune images starting from oldest turns
  if (calculateTotalSize() > MAX_REQUEST_BUDGET_BYTES) {
    for (let i = 0; i < candidateHistory.length; i++) {
      if (calculateTotalSize() <= MAX_REQUEST_BUDGET_BYTES) {
        break;
      }

      const item = candidateHistory[i];
      if (item.hasImages && Array.isArray(item.content)) {
        // Drop images from this older message, retain only the text part
        const textPart = item.content.find((p) => p.type === "text");
        item.content = textPart ? textPart.text : "";
        droppedImageCount += item.imageParts.length;
        item.hasImages = false;
      }
    }
  }

  // Long text-only conversations also grow beyond the request limit. Remove
  // the oldest turns from model context while leaving the saved chat intact.
  while (candidateHistory.length > 0 && calculateTotalSize() > MAX_REQUEST_BUDGET_BYTES) {
    const removed = candidateHistory.shift()!;
    droppedMessageCount++;
    if (removed.hasImages) droppedImageCount += removed.imageParts.length;
  }

  const payloadMessages: OpenRouterFormattedMessage[] = [
    ...candidateHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    {
      role: "user",
      content:
        currentTurnParts.length === 1 && currentTurnParts[0].type === "text"
          ? currentTurnParts[0].text
          : currentTurnParts,
    },
  ];

  return {
    payloadMessages,
    droppedImageCount,
    droppedMessageCount,
    exceedsBudget: calculateTotalSize() > MAX_REQUEST_BUDGET_BYTES,
  };
}
