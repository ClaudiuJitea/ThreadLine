"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Conversation,
  ChatMessage,
  AllowedModelId,
  ImageAttachmentMetadata,
} from "@/lib/types";
import { DEFAULT_MODEL_ID, getModelInfo } from "@/lib/models";
import {
  loadStoredConversations,
  saveStoredConversations,
  getStoredActiveConversationId,
  setStoredActiveConversationId,
  createNewConversationObject,
} from "@/lib/storage";
import { buildPayloadWithBudgetControl } from "@/lib/image-utils";
import { cacheGeneratedImage, rehydrateMessagesFromCache } from "@/lib/image-cache";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { ChatArea } from "./ChatArea";

export function ChatContainer() {
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = loadStoredConversations();
    if (stored.length > 0) return stored;
    const initial = createNewConversationObject(DEFAULT_MODEL_ID);
    saveStoredConversations([initial]);
    return [initial];
  });

  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = loadStoredConversations();
    const storedActiveId = getStoredActiveConversationId();
    if (stored.length > 0) {
      const matched = stored.find((c) => c.id === storedActiveId);
      return matched ? matched.id : stored[0].id;
    }
    return null;
  });

  const [selectedModelId, setSelectedModelId] = useState<AllowedModelId>(() => {
    if (typeof window === "undefined") return DEFAULT_MODEL_ID;
    const stored = loadStoredConversations();
    const storedActiveId = getStoredActiveConversationId();
    if (stored.length > 0) {
      const matched = stored.find((c) => c.id === storedActiveId);
      return (matched?.modelId || stored[0].modelId || DEFAULT_MODEL_ID) as AllowedModelId;
    }
    return DEFAULT_MODEL_ID;
  });

  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>("1:1");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("threadline_sidebar_open");
      if (saved !== null) {
        return saved === "true";
      }
      return window.innerWidth >= 1024;
    } catch {
      return true;
    }
  });

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("threadline_sidebar_open", String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleToggleSidebar]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Persist conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      saveStoredConversations(conversations);
    }
  }, [conversations]);

  // Rehydrate full-resolution generated images from IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setConversations((prev) => {
        let needsUpdate = false;
        Promise.all(
          prev.map(async (conv) => {
            const rehydrated = await rehydrateMessagesFromCache(conv.messages);
            if (rehydrated !== conv.messages) needsUpdate = true;
            return { ...conv, messages: rehydrated };
          })
        ).then((updated) => {
          if (isMounted && needsUpdate) {
            setConversations(updated);
          }
        });
        return prev;
      });
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const effectiveActiveId =
    activeConversationId || (conversations[0]?.id ?? null);

  const activeConversation = conversations.find(
    (c) => c.id === effectiveActiveId
  );

  const handleSelectConversation = (id: string) => {
    if (isStreaming) {
      handleStopGeneration();
    }
    setActiveConversationId(id);
    setStoredActiveConversationId(id);
    const target = conversations.find((c) => c.id === id);
    if (target) {
      setSelectedModelId(target.modelId || DEFAULT_MODEL_ID);
    }
    // Only auto-close on mobile overlay screens (< 1024px)
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleNewChat = () => {
    if (isStreaming) {
      handleStopGeneration();
    }
    const newChat = createNewConversationObject(selectedModelId);
    setConversations((prev) => [newChat, ...prev]);
    setActiveConversationId(newChat.id);
    setStoredActiveConversationId(newChat.id);
    // Only auto-close on mobile overlay screens (< 1024px)
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteConversation = (id: string) => {
    if (isStreaming && activeConversationId === id) {
      handleStopGeneration();
    }
    const filtered = conversations.filter((c) => c.id !== id);
    setConversations(filtered);
    saveStoredConversations(filtered);

    if (activeConversationId === id) {
      if (filtered.length > 0) {
        setActiveConversationId(filtered[0].id);
        setStoredActiveConversationId(filtered[0].id);
      } else {
        const fresh = createNewConversationObject(selectedModelId);
        setConversations([fresh]);
        setActiveConversationId(fresh.id);
        setStoredActiveConversationId(fresh.id);
      }
    }
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
    );
  };

  const handleSelectModel = (modelId: AllowedModelId) => {
    setSelectedModelId(modelId);
    if (activeConversationId) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId ? { ...c, modelId } : c
        )
      );
    }
  };

  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  const handleSendMessage = async (
    prompt: string,
    images: ImageAttachmentMetadata[],
    customHistory?: ChatMessage[],
    customWebSearch?: boolean,
    customAspectRatio?: string
  ) => {
    if (!activeConversation) return;

    const modelInfo = getModelInfo(selectedModelId);
    const isImageGeneration = Boolean(modelInfo.isImageGenerator);
    const activeUseWebSearch =
      !isImageGeneration && (customWebSearch !== undefined ? customWebSearch : isWebSearchEnabled);

    if (activeUseWebSearch) {
      setIsSearchingWeb(true);
    }

    // Build the user message
    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      role: "user",
      content: prompt,
      createdAt: Date.now(),
      attachments: images,
    };

    const currentHistory =
      customHistory !== undefined ? customHistory : activeConversation.messages;

    // Check request budget and prune older images if necessary
    const aspectRatio = customAspectRatio || selectedAspectRatio;
    const { payloadMessages, droppedImageCount, droppedMessageCount, exceedsBudget } = buildPayloadWithBudgetControl(
      isImageGeneration ? [] : currentHistory,
      prompt,
      isImageGeneration ? [] : images,
      { model: selectedModelId, webSearch: activeUseWebSearch, aspectRatio }
    );

    if (droppedImageCount > 0 || droppedMessageCount > 0) {
      userMessage.contextWarning = `To fit the request size limit, ${droppedImageCount} older image(s) and ${droppedMessageCount} older message(s) were omitted from model context. Your saved conversation is unchanged.`;
    }

    // Auto-generate conversation title from the first message
    let updatedTitle = activeConversation.title;
    if (
      currentHistory.length === 0 &&
      (updatedTitle === "New Conversation" || !updatedTitle)
    ) {
      updatedTitle = prompt.slice(0, 32) || (images.length > 0 ? "Image Analysis" : "New Conversation");
    }

    // Prepare assistant placeholder message
    const assistantMessageId = `msg_asst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      modelId: selectedModelId,
      modelName: modelInfo.name,
      modelProvider: modelInfo.provider,
      isWebSearch: activeUseWebSearch,
    };

    // Update conversation with user message and empty assistant message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConversationId) {
          const baseMessages =
            customHistory !== undefined ? customHistory : c.messages;
          return {
            ...c,
            title: updatedTitle,
            updatedAt: Date.now(),
            modelId: selectedModelId,
            messages: [...baseMessages, userMessage, assistantMessage],
          };
        }
        return c;
      })
    );

    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (isImageGeneration && images.length > 0) {
        throw new Error("This image generator accepts text prompts only. Remove attached images and try again.");
      }
      if (exceedsBudget) {
        throw new Error("This message is too large to send. Remove an image or shorten the text and try again.");
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModelId,
          messages: payloadMessages,
          webSearch: activeUseWebSearch,
          aspectRatio,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMsg = `Server error (${response.status})`;
        try {
          const errJson = await response.json();
          if (errJson.error) {
            errorMsg = errJson.error;
          }
        } catch {
          const errText = await response.text();
          if (errText) errorMsg = errText;
        }

        // Check if unauthorized, redirect to login
        if (response.status === 401) {
          router.push("/login");
          router.refresh();
          return;
        }

        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No readable stream received from chat API.");
      }

      const decoder = new TextDecoder("utf-8");
      let accumulatedText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;

          if (trimmed === "data: [DONE]") {
            break;
          }

          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.substring(6);
            try {
              const parsed = JSON.parse(dataStr);

              // Handle search sources metadata event
              if (parsed.type === "search_sources") {
                setIsSearchingWeb(false);
                setConversations((prev) =>
                  prev.map((c) => {
                    if (c.id === activeConversationId) {
                      return {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === assistantMessageId
                            ? {
                                ...m,
                                sources: parsed.sources || [],
                                isWebSearch: true,
                              }
                            : m
                        ),
                      };
                    }
                    return c;
                  })
                );
                continue;
              }

              // Handle generated image event from OpenRouter image models
              if (parsed.type === "image_generated" && parsed.image) {
                const generatedImage = parsed.image;
                cacheGeneratedImage(generatedImage);
                setConversations((prev) =>
                  prev.map((c) => {
                    if (c.id === activeConversationId) {
                      return {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === assistantMessageId
                            ? {
                                ...m,
                                generatedImages: [
                                  ...(m.generatedImages || []),
                                  generatedImage,
                                ],
                              }
                            : m
                        ),
                      };
                    }
                    return c;
                  })
                );
                continue;
              }

              const deltaContent = parsed.choices?.[0]?.delta?.content;
              if (deltaContent) {
                setIsSearchingWeb(false);
                accumulatedText += deltaContent;

                setConversations((prev) =>
                  prev.map((c) => {
                    if (c.id === activeConversationId) {
                      return {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === assistantMessageId
                            ? { ...m, content: accumulatedText }
                            : m
                        ),
                      };
                    }
                    return c;
                  })
                );
              }
            } catch {
              // Non-JSON SSE line or partial chunk, continue
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // User aborted the stream intentionally
        return;
      }

      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during generation.";

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConversationId) {
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: errorMsg,
                      isError: true,
                    }
                  : m
              ),
            };
          }
          return c;
        })
      );
    } finally {
      setIsStreaming(false);
      setIsSearchingWeb(false);
      abortControllerRef.current = null;
    }
  };

  const handleEditPrompt = async (messageId: string, newContent: string) => {
    if (!activeConversation || activeConversation.messages.length === 0) return;

    if (isStreaming) {
      handleStopGeneration();
    }

    const msgs = activeConversation.messages;
    const msgIndex = msgs.findIndex((m) => m.id === messageId);
    if (msgIndex === -1) return;

    const targetMsg = msgs[msgIndex];
    const previousHistory = msgs.slice(0, msgIndex);
    const nextMsg = msgs[msgIndex + 1];
    const hadWebSearch = nextMsg?.isWebSearch;

    // Resend updated prompt preserving any image attachments from this message
    await handleSendMessage(
      newContent,
      targetMsg.attachments || [],
      previousHistory,
      hadWebSearch !== undefined ? hadWebSearch : isWebSearchEnabled
    );
  };

  const handleRetry = async () => {
    if (!activeConversation || activeConversation.messages.length === 0) return;

    // Find the last user message
    const msgs = activeConversation.messages;
    let lastUserIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    const lastUserMsg = msgs[lastUserIndex];
    const previousHistory = msgs.slice(0, lastUserIndex);
    const lastAsstMsg = msgs[msgs.length - 1];
    const hadWebSearch = lastAsstMsg?.isWebSearch;

    // Resend the prompt and attachments with previousHistory
    await handleSendMessage(
      lastUserMsg.content,
      lastUserMsg.attachments || [],
      previousHistory,
      hadWebSearch !== undefined ? hadWebSearch : isWebSearchEnabled
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8F5EF] text-[#302D29]">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={effectiveActiveId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onToggleOpen={handleToggleSidebar}
      />

      {/* Chat Area */}
      <ChatArea
        conversationId={activeConversation?.id || ""}
        conversationTitle={activeConversation?.title || "New Conversation"}
        messages={activeConversation?.messages || []}
        selectedModelId={selectedModelId}
        onSelectModel={handleSelectModel}
        onSendMessage={handleSendMessage}
        onEditPrompt={handleEditPrompt}
        onRetry={handleRetry}
        onStopGeneration={handleStopGeneration}
        isStreaming={isStreaming}
        isSearchingWeb={isSearchingWeb}
        isWebSearchEnabled={isWebSearchEnabled}
        onToggleWebSearch={() => setIsWebSearchEnabled((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        onNewChat={handleNewChat}
        selectedAspectRatio={selectedAspectRatio}
        onSelectAspectRatio={setSelectedAspectRatio}
      />
    </div>
  );
}
