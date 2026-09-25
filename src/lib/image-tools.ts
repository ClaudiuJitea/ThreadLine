/**
 * Image Utilities and Interactive Tools
 * Provides downloading, clipboard copying, filename formatting,
 * and aspect ratio presets for generated images.
 */

export interface AspectRatioOption {
  id: string;
  label: string;
  description: string;
}

export const ASPECT_RATIO_OPTIONS: readonly AspectRatioOption[] = [
  { id: "1:1", label: "1:1", description: "Square (1:1)" },
  { id: "16:9", label: "16:9", description: "Wide Landscape (16:9)" },
  { id: "9:16", label: "9:16", description: "Tall Portrait (9:16)" },
  { id: "4:3", label: "4:3", description: "Standard Photo (4:3)" },
  { id: "3:4", label: "3:4", description: "Vertical Photo (3:4)" },
] as const;

/**
 * Derives a sanitized, readable filename from an image prompt.
 */
export function formatImageFilename(prompt: string, prefix = "recraft"): string {
  const sanitized = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);

  return `${prefix}-${sanitized || "generated"}-${timestamp}.png`;
}

/**
 * Downloads an image (data URL, blob URL, or external HTTPS URL)
 * directly to the user's local disk.
 */
export async function downloadImage(url: string, filename?: string): Promise<void> {
  const effectiveFilename = filename || `threadline-image-${Date.now()}.png`;

  // 1. Data URLs & Blob URLs can be downloaded directly
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    const a = document.createElement("a");
    a.href = url;
    a.download = effectiveFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // 2. Remote HTTPS URLs: Fetch as blob to prevent cross-origin navigation
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = effectiveFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  } catch (err) {
    console.warn("Blob download failed, falling back to direct anchor:", err);
    const a = document.createElement("a");
    a.href = url;
    a.download = effectiveFilename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Copies an image directly to the system clipboard as a PNG raster image.
 * Falls back to copying image URL if clipboard.write is not supported.
 */
export async function copyImageToClipboard(url: string): Promise<"image" | "url"> {
  if (typeof window === "undefined" || !navigator.clipboard) {
    throw new Error("Clipboard API not available");
  }

  // Try copying raster image blob if ClipboardItem is supported
  if (typeof ClipboardItem !== "undefined" && typeof navigator.clipboard.write === "function") {
    try {
      let blob: Blob;

      if (url.startsWith("data:")) {
        const res = await fetch(url);
        blob = await res.blob();
      } else {
        const res = await fetch(url, { mode: "cors" });
        blob = await res.blob();
      }

      // Convert to image/png if necessary
      if (blob.type !== "image/png") {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Image failed to load for clipboard conversion"));
          img.src = url;
        });

        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not initialize 2D canvas context");
        ctx.drawImage(img, 0, 0);

        blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error("Failed to export PNG blob from canvas"));
          }, "image/png");
        });
      }

      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      return "image";
    } catch (err) {
      console.warn("Direct image clipboard copy failed, falling back to text URL:", err);
    }
  }

  // Fallback: Copy URL string
  await navigator.clipboard.writeText(url);
  return "url";
}
