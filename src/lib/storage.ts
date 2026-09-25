import { Conversation, AllowedModelId } from "./types";
import { sanitizeMessagesForLocalStorage } from "./image-utils";
import { DEFAULT_MODEL_ID } from "./models";

const STORAGE_KEY = "threadline_conversations_v1";
const ACTIVE_CHAT_KEY = "threadline_active_chat_id";

export function loadStoredConversations(): Conversation[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    console.error("Failed to load conversations from localStorage:", error);
    return [];
  }
}

export function saveStoredConversations(conversations: Conversation[]): void {
  if (typeof window === "undefined") return;

  try {
    // Crucial requirement: Never save base64 images in localStorage to prevent quota exhaustion
    const sanitized = conversations.map((conv) => ({
      ...conv,
      messages: sanitizeMessagesForLocalStorage(conv.messages),
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (error) {
    console.error("Failed to persist conversations to localStorage:", error);
  }
}

export function getStoredActiveConversationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_CHAT_KEY);
}

export function setStoredActiveConversationId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) {
    localStorage.setItem(ACTIVE_CHAT_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_CHAT_KEY);
  }
}

export function createNewConversationObject(
  modelId: AllowedModelId = DEFAULT_MODEL_ID
): Conversation {
  const timestamp = Date.now();
  return {
    id: `conv_${timestamp}_${Math.random().toString(36).substring(2, 8)}`,
    title: "New Conversation",
    createdAt: timestamp,
    updatedAt: timestamp,
    modelId,
    messages: [],
  };
}
