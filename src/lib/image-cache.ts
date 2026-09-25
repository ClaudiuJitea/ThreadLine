/**
 * Browser IndexedDB Image Cache
 * Safely persists generated high-resolution base64 images in browser IndexedDB,
 * bypassing localStorage's 5MB quota constraint.
 */

import { ChatMessage, GeneratedImageMetadata } from "./types";

const DB_NAME = "threadline_image_db";
const STORE_NAME = "generated_images";
const DB_VERSION = 1;

function openImageDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Persists a generated image to IndexedDB.
 */
export async function cacheGeneratedImage(image: GeneratedImageMetadata): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const db = await openImageDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(image);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to cache generated image in IndexedDB:", err);
  }
}

/**
 * Retrieves a generated image by ID from IndexedDB.
 */
export async function getCachedGeneratedImage(id: string): Promise<GeneratedImageMetadata | null> {
  if (typeof window === "undefined") return null;

  try {
    const db = await openImageDatabase();
    return await new Promise<GeneratedImageMetadata | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to retrieve cached image from IndexedDB:", err);
    return null;
  }
}

/**
 * Asynchronously rehydrates any generated images whose base64 URLs were omitted
 * from localStorage.
 */
export async function rehydrateMessagesFromCache(
  messages: ChatMessage[]
): Promise<ChatMessage[]> {
  if (typeof window === "undefined") return messages;

  const hasMissingImages = messages.some((m) =>
    m.generatedImages?.some((img) => !img.url || img.url === "")
  );

  if (!hasMissingImages) return messages;

  try {
    const db = await openImageDatabase();

    const updatedMessages = await Promise.all(
      messages.map(async (msg) => {
        if (!msg.generatedImages || msg.generatedImages.length === 0) {
          return msg;
        }

        const rehydratedImages = await Promise.all(
          msg.generatedImages.map(async (img) => {
            if (img.url && img.url !== "") return img;

            return new Promise<GeneratedImageMetadata>((resolve) => {
              try {
                const tx = db.transaction(STORE_NAME, "readonly");
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(img.id);
                req.onsuccess = () => {
                  if (req.result?.url) {
                    resolve({ ...img, url: req.result.url });
                  } else {
                    resolve(img);
                  }
                };
                req.onerror = () => resolve(img);
              } catch {
                resolve(img);
              }
            });
          })
        );

        return { ...msg, generatedImages: rehydratedImages };
      })
    );

    return updatedMessages;
  } catch {
    return messages;
  }
}
