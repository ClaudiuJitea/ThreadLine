"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ChatMessage,
  AllowedModelId,
  ImageAttachmentMetadata,
} from "@/lib/types";
import { getModelInfo } from "@/lib/models";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ModelSelector } from "./ModelSelector";
import {
  Send,
  Square,
  RotateCcw,
  Image as ImageIcon,
  X,
  AlertTriangle,
  Bot,
  User,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  FileQuestion,
  Maximize2,
  Minimize2,
  ZoomIn,
  Download,
  Copy,
  Check,
  Pencil,
  Mail,
  FileEdit,
  Code2,
  Gamepad2,
  Globe,
  PanelLeft,
  Plus,
  CheckCheck,
  Wand2,
  Feather,
  ChevronDown,
  ChevronUp,
  Smile,
  Languages,
  ArrowRightLeft,
  Undo2,
  AlignLeft,
  Flag,
} from "lucide-react";
import {
  StarterCategory,
  STARTER_CATEGORIES,
  getStarterPrompts,
} from "@/lib/starter-prompts";
import {
  SUPPORTED_LANGUAGES,
  SOURCE_LANGUAGES,
  getLanguageName,
} from "@/lib/translate";
import { compressImage } from "@/lib/image-utils";
import { buildRefinePrompt, REFINE_ACTIONS, type RefineActionId } from "@/lib/refine";
import {
  downloadImage,
  copyImageToClipboard,
  ASPECT_RATIO_OPTIONS,
} from "@/lib/image-tools";
import { GeneratedImageCard } from "./GeneratedImageCard";
import {
  ThinkingIndicator,
  CompletedThoughtProcess,
  parseThinkingContent,
} from "./ThinkingIndicator";
import { WebSearchSources } from "./WebSearchSources";

interface PreviewModalData {
  src: string;
  name: string;
  size?: number;
  width?: number;
  height?: number;
}

interface ChatAreaProps {
  conversationId: string;
  conversationTitle: string;
  messages: ChatMessage[];
  selectedModelId: AllowedModelId;
  onSelectModel: (modelId: AllowedModelId) => void;
  onSendMessage: (
    prompt: string,
    images: ImageAttachmentMetadata[],
    customHistory?: ChatMessage[],
    customWebSearch?: boolean,
    customAspectRatio?: string,
    customTranslation?: {
      enabled: boolean;
      source: string;
      target: string;
    }
  ) => Promise<void>;
  onEditPrompt?: (
    messageId: string,
    newContent: string
  ) => Promise<void>;
  onRetry: () => void;
  onStopGeneration: () => void;
  isConversationFlagged?: boolean;
  onToggleFlagConversation?: (conversationId: string) => void;
  isStreaming: boolean;
  isSearchingWeb?: boolean;
  isWebSearchEnabled?: boolean;
  onToggleWebSearch?: () => void;
  isTranslateEnabled?: boolean;
  onToggleTranslate?: () => void;
  translateSource?: string;
  onChangeTranslateSource?: (source: string) => void;
  translateTarget?: string;
  onChangeTranslateTarget?: (target: string) => void;
  onSwapTranslateLanguages?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar: () => void;
  onNewChat?: () => void;
  activeModelNotice?: string | null;
  selectedAspectRatio?: string;
  onSelectAspectRatio?: (ratio: string) => void;
}

function extractImageFiles(clipboardData: DataTransfer): File[] {
  const items = clipboardData.items;
  const imageFiles: File[] = [];

  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          const isDuplicate = imageFiles.some(
            (f) =>
              f.name === file.name &&
              f.size === file.size &&
              f.type === file.type &&
              f.lastModified === file.lastModified
          );
          if (!isDuplicate) {
            imageFiles.push(file);
          }
        }
      }
    }
  }

  if (
    imageFiles.length === 0 &&
    clipboardData.files &&
    clipboardData.files.length > 0
  ) {
    for (let i = 0; i < clipboardData.files.length; i++) {
      const file = clipboardData.files[i];
      if (file.type.startsWith("image/")) {
        const isDuplicate = imageFiles.some(
          (f) =>
            f.name === file.name &&
            f.size === file.size &&
            f.type === file.type &&
            f.lastModified === file.lastModified
        );
        if (!isDuplicate) {
          imageFiles.push(file);
        }
      }
    }
  }

  return imageFiles;
}

export function ChatArea({
  conversationId,
  conversationTitle,
  isConversationFlagged = false,
  messages,
  selectedModelId,
  onSelectModel,
  onSendMessage,
  onEditPrompt,
  onRetry,
  onStopGeneration,
  onToggleFlagConversation,
  isStreaming,
  isSearchingWeb = false,
  isWebSearchEnabled = false,
  onToggleWebSearch,
  isTranslateEnabled = false,
  onToggleTranslate,
  translateSource = "auto",
  onChangeTranslateSource,
  translateTarget = "en",
  onChangeTranslateTarget,
  onSwapTranslateLanguages,
  isSidebarOpen = true,
  onToggleSidebar,
  onNewChat,
  selectedAspectRatio = "1:1",
  onSelectAspectRatio,
}: ChatAreaProps) {
  const [inputText, setInputText] = useState("");
  const [attachedImages, setAttachedImages] = useState<
    ImageAttachmentMetadata[]
  >([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<PreviewModalData | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [copiedPreviewImage, setCopiedPreviewImage] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInputText, setEditInputText] = useState("");
  const [internalAspectRatio, setInternalAspectRatio] = useState<string>("1:1");

  const activeModel = getModelInfo(selectedModelId);

  const activeAspectRatio = selectedAspectRatio || internalAspectRatio;
  const handleSelectAspectRatio = (ratio: string) => {
    setInternalAspectRatio(ratio);
    onSelectAspectRatio?.(ratio);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectModel = (modelId: AllowedModelId) => {
    if (!getModelInfo(modelId).supportsImages) {
      setAttachedImages([]);
      setIsDraggingOver(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    onSelectModel(modelId);
  };

  const handleCopyMessage = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  const handleSaveEditPrompt = async (messageId: string) => {
    if (!editInputText.trim() || isStreaming) return;
    const textToSend = editInputText.trim();
    setEditingMessageId(null);
    if (onEditPrompt) {
      await onEditPrompt(messageId, textToSend);
    } else {
      setInputText(textToSend);
      textareaRef.current?.focus();
    }
  };

  const [selectedCategoryOverride, setSelectedCategoryOverride] =
    useState<StarterCategory | null>(null);

  const selectedStarterCategory: StarterCategory = (() => {
    if (activeModel.isImageGenerator) {
      return "image-generation";
    }
    if (selectedCategoryOverride === "image-generation") {
      return "everyday";
    }
    return selectedCategoryOverride ?? "everyday";
  })();

  const starterScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(true);

  const currentStarterPrompts = getStarterPrompts(selectedStarterCategory);
  const hasStarterScroll = currentStarterPrompts.length > 4;

  const handleStarterScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setCanScrollUp(scrollTop > 4);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 6);
  };

  const handleScrollPrompts = (direction: "up" | "down") => {
    const el = starterScrollRef.current;
    if (!el) return;
    const scrollAmount = direction === "down" ? 110 : -110;
    el.scrollBy({ top: scrollAmount, behavior: "smooth" });
  };

  const handleSelectStarterPrompt = (promptText: string) => {
    setPreviousInputText(null);
    setInputText(promptText);
    setTimeout(() => {
      if (!textareaRef.current) return;
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
      textareaRef.current.focus();
      const placeholderMatch = promptText.match(/\[(.*?)\]/);
      if (placeholderMatch && placeholderMatch.index !== undefined) {
        const start = placeholderMatch.index;
        const end = start + placeholderMatch[0].length;
        textareaRef.current.setSelectionRange(start, end);
      } else {
        textareaRef.current.setSelectionRange(
          promptText.length,
          promptText.length
        );
      }
    }, 20);
  };

  const renderCategoryIcon = (iconName: string, className = "w-3.5 h-3.5") => {
    switch (iconName) {
      case "CheckCheck":
        return <CheckCheck className={className} />;
      case "Wand2":
        return <Wand2 className={className} />;
      case "Feather":
        return <Feather className={className} />;
      case "Smile":
        return <Smile className={className} />;
      case "AlignLeft":
        return <AlignLeft className={className} />;
      case "Languages":
        return <Languages className={className} />;
      case "Mail":
        return <Mail className={className} />;
      case "FileEdit":
        return <FileEdit className={className} />;
      case "Code2":
        return <Code2 className={className} />;
      case "Gamepad2":
        return <Gamepad2 className={className} />;
      case "Image":
        return <ImageIcon className={className} />;
      case "Sparkles":
      default:
        return <Sparkles className={className} />;
    }
  };

  const getPromptCategoryIcon = (category: string) => {
    switch (category) {
      case "text":
      case "text-correction":
      case "text-improvement":
      case "text-polish":
        return "Wand2";
      case "image-generation":
        return "Image";
      case "everyday":
        return "Sparkles";
      case "mail":
      case "mail-correction":
      case "mail-suggestion":
        return "Mail";
      case "coding-apps":
        return "Code2";
      case "games":
        return "Gamepad2";
      default:
        return "Sparkles";
    }
  };

  const refineMenuRef = useRef<HTMLDivElement>(null);
  const [isRefineMenuOpen, setIsRefineMenuOpen] = useState(false);
  const [previousInputText, setPreviousInputText] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        refineMenuRef.current &&
        !refineMenuRef.current.contains(event.target as Node)
      ) {
        setIsRefineMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsRefineMenuOpen(false);
    };
    if (isRefineMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isRefineMenuOpen]);

  const handleUndoRefine = () => {
    if (previousInputText !== null) {
      setInputText(previousInputText);
      setPreviousInputText(null);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${Math.min(
            textareaRef.current.scrollHeight,
            200
          )}px`;
        }
      }, 20);
    }
  };

  const handleApplyRefineAction = (action: RefineActionId) => {
    const draft = previousInputText ?? inputText.trim();
    if (!draft) {
      setIsRefineMenuOpen(false);
      textareaRef.current?.focus();
      return;
    }
    setIsRefineMenuOpen(false);
    setPreviousInputText(draft);
    const newPrompt = buildRefinePrompt(action, draft);
    setInputText(newPrompt);
    setTimeout(() => {
      if (!textareaRef.current) return;
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
      textareaRef.current.focus();

      textareaRef.current.setSelectionRange(
        newPrompt.length,
        newPrompt.length
      );
    }, 20);
  };

  const [isWideLayout, setIsWideLayout] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("threadline_wide_layout") === "true";
    } catch {
      return false;
    }
  });

  const toggleWideLayout = () => {
    setIsWideLayout((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("threadline_wide_layout", String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const handleDownloadPreviewImage = async () => {
    if (!previewModalImage) return;
    await downloadImage(previewModalImage.src, previewModalImage.name || "image.png");
  };

  const handleCopyPreviewImage = async () => {
    if (!previewModalImage) return;
    try {
      await copyImageToClipboard(previewModalImage.src);
      setCopiedPreviewImage(true);
      setTimeout(() => setCopiedPreviewImage(false), 2000);
    } catch (err) {
      console.error("Failed to copy preview image:", err);
    }
  };

  // Close preview modal on Escape key press
  useEffect(() => {
    if (!previewModalImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewModalImage(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewModalImage]);

  const contentWidthClass = isWideLayout
    ? "w-full max-w-[1600px] mx-auto px-2 sm:px-6 transition-all duration-200"
    : "w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto px-2 sm:px-4 transition-all duration-200";

  // Auto scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Core image processing pipeline for file upload, drag-and-drop, and Ctrl+V clipboard paste
  const processImageFiles = useCallback(async (files: File[]) => {
    if (!activeModel.supportsImages || !files || files.length === 0) return;
    setImageError(null);
    setIsCompressing(true);

    try {
      const newAttachments: ImageAttachmentMetadata[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          setImageError(
            `Skipped "${file.name || "Pasted image"}": Only JPEG, PNG, and WebP are supported.`
          );
          continue;
        }

        const compressed = await compressImage(file);
        newAttachments.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name || `Pasted Image ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}.png`,
          type: compressed.type,
          size: compressed.size,
          width: compressed.width,
          height: compressed.height,
          dataUrl: compressed.dataUrl,
        });
      }

      if (newAttachments.length > 0) {
        setAttachedImages((prev) => [...prev, ...newAttachments]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setImageError(msg);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [activeModel.supportsImages]);

  // Textarea Ctrl+V paste handler
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;
    if (!activeModel.supportsImages) return;

    const imageFiles = extractImageFiles(clipboardData);

    if (imageFiles.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      await processImageFiles(imageFiles);

      // If text was also copied with the image, paste the text into the textarea
      const pastedText = clipboardData.getData("text/plain");
      if (pastedText && pastedText.trim()) {
        setInputText((prev) => (prev ? `${prev} ${pastedText}` : pastedText));
      }
    }
  };

  // Global window paste listener: allows pressing Ctrl+V anywhere in the chat area
  useEffect(() => {
    if (!activeModel.supportsImages) return;
    const handleWindowPaste = (e: ClipboardEvent) => {
      // Ignore if user is pasting inside an input, textarea, or contentEditable element
      // (the chat textarea already handles its own paste event via handlePaste)
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const imageFiles = extractImageFiles(clipboardData);

      if (imageFiles.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        processImageFiles(imageFiles);
        textareaRef.current?.focus();
      }
    };

    window.addEventListener("paste", handleWindowPaste);
    return () => window.removeEventListener("paste", handleWindowPaste);
  }, [activeModel.supportsImages, processImageFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (activeModel.supportsImages) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (!activeModel.supportsImages) return;
    if (
      e.dataTransfer &&
      e.dataTransfer.files &&
      e.dataTransfer.files.length > 0
    ) {
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length > 0) {
        await processImageFiles(files);
      }
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setInputText(e.target.value);
    setPreviousInputText(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processImageFiles(Array.from(files));
  };

  const removeAttachedImage = (id: string) => {
    setAttachedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isStreaming || isCompressing) return;

    const trimmed = inputText.trim();
    if (!trimmed && (!activeModel.supportsImages || attachedImages.length === 0)) return;

    const imagesToSend = activeModel.supportsImages ? [...attachedImages] : [];
    const textToSend = trimmed;

    // Reset input fields
    setInputText("");
    setPreviousInputText(null);
    setAttachedImages([]);
    setImageError(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const translationParams =
      isTranslateEnabled && !activeModel.isImageGenerator
        ? {
            enabled: true,
            source: translateSource,
            target: translateTarget,
          }
        : undefined;

    await onSendMessage(
      textToSend,
      imagesToSend,
      undefined,
      undefined,
      activeAspectRatio,
      translationParams
    );
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8F5EF] overflow-hidden relative">
      {/* Top Navigation Bar - Refined Compact Layer */}
      <header
        className={`mx-2 sm:mx-3 mt-2 h-10.5 px-3 sm:px-4 rounded-xl border flex items-center justify-between z-20 shrink-0 transition-all duration-150 ${
          isConversationFlagged
            ? "border-[#DEBAAB] bg-[#FAF2ED] shadow-[0_1px_4px_rgba(192,106,73,0.08),inset_0_-1px_0_0_rgba(255,255,255,0.8)]"
            : "border-[#D6CEC1] bg-[#FAF7F2]/95 backdrop-blur-xs shadow-[0_1px_3px_rgba(40,36,30,0.03),inset_0_-1px_0_0_rgba(255,255,255,0.8)]"
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {/* Mobile Sidebar Toggle Button themed with logo color */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`w-7 h-7 rounded-lg bg-[#344D3C] hover:bg-[#2A3E31] items-center justify-center text-[#F8F5EF] shadow-2xs cursor-pointer active:scale-95 transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#344D3C]/50 ${
              isSidebarOpen ? "hidden" : "flex lg:hidden"
            }`}
            title="Open sidebar (Ctrl+B)"
            aria-label="Open sidebar"
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0 py-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <h2
                className="text-[12.5px] sm:text-[13px] font-semibold text-[#2D2A26] tracking-tight leading-none truncate max-w-[130px] xs:max-w-[180px] sm:max-w-xs md:max-w-sm lg:max-w-md"
                title={conversationTitle || "New Conversation"}
              >
                {conversationTitle || "New Conversation"}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#716B62] leading-none min-w-0 mt-0.5 sm:mt-0">
              <span className="hidden sm:inline text-[#C7BFB2]">•</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#536E59] shrink-0" aria-hidden="true" />
              <span
                className="font-medium text-[#465E4C] truncate max-w-[110px] xs:max-w-[150px] sm:max-w-[200px]"
                title={activeModel.name}
              >
                {activeModel.name}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile New Chat Action Button */}
          {onNewChat && (
            <button
              type="button"
              onClick={onNewChat}
              className="flex lg:hidden h-7 items-center gap-1 px-2 rounded-md bg-[#536E59] hover:bg-[#405845] text-[#FFFCF7] text-[11px] font-medium transition-all duration-150 cursor-pointer shadow-xs active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#536E59]/40"
              title="New chat"
              aria-label="New chat"
            >
              <Plus className="w-3 h-3" />
              <span className="hidden xs:inline">New</span>
            </button>
          )}

          {/* Conversation Flag Toggle Button */}
          {onToggleFlagConversation && conversationId && (
            <button
              type="button"
              onClick={() => onToggleFlagConversation(conversationId)}
              aria-pressed={isConversationFlagged}
              className={`group h-7 flex items-center gap-1.5 px-2 sm:px-2.5 rounded-md border text-[11px] font-medium transition-all duration-150 cursor-pointer shadow-2xs active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C06A49]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#F4EFE6] ${
                isConversationFlagged
                  ? "bg-[#FFF2EC] border-[#DE9E87] text-[#A84B2E] shadow-xs hover:bg-[#FBE8DF]"
                  : "bg-[#FFFCF7] hover:bg-[#F2ECE2] border-[#D8CFC2] hover:border-[#DE9E87]/80 text-[#6B6258] hover:text-[#A84B2E]"
              }`}
              title={
                isConversationFlagged
                  ? "Unflag this conversation"
                  : "Flag this conversation"
              }
              aria-label={
                isConversationFlagged
                  ? "Unflag this conversation"
                  : "Flag this conversation"
              }
            >
              <Flag
                className={`w-3 h-3 ${
                  isConversationFlagged
                    ? "fill-current text-[#C06A49]"
                    : "text-[#8E867B] group-hover:text-[#C06A49]"
                }`}
              />
              <span className="hidden xs:inline">
                {isConversationFlagged ? "Flagged" : "Flag"}
              </span>
            </button>
          )}

          {/* Layout Width Toggle Button */}
          <button
            type="button"
            onClick={toggleWideLayout}
            aria-pressed={isWideLayout}
            className={`group h-7 flex items-center gap-1.5 px-2 sm:px-2.5 rounded-md border text-[11px] font-medium transition-all duration-150 cursor-pointer shadow-2xs active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#536E59]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#F4EFE6] ${
              isWideLayout
                ? "bg-[#EDF3EB] border-[#536E59]/40 text-[#405845] hover:bg-[#E3ECE0] shadow-xs"
                : "bg-[#FFFCF7] hover:bg-[#EDE7DC] border-[#D8CFC2] hover:border-[#536E59]/40 text-[#5C564E] hover:text-[#2B2824]"
            }`}
            title={isWideLayout ? "Switch to standard width" : "Switch to expanded full width"}
            aria-label={isWideLayout ? "Switch to standard width" : "Switch to expanded full width"}
          >
            {isWideLayout ? (
              <>
                <Minimize2 className="w-3 h-3 text-[#536E59] transition-transform duration-150 group-hover:scale-105 shrink-0" />
                <span className="hidden md:inline">Standard Width</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3 text-[#536E59] transition-transform duration-150 group-hover:scale-105 shrink-0" />
                <span className="hidden md:inline">Full Width</span>
              </>
            )}
          </button>

          {/* Subtle Vertical Separator between Action and Status */}
          <div className="hidden sm:block h-3.5 w-px bg-[#D8CFC2]/70 mx-0.5" aria-hidden="true" />

          {/* Private Session Status Badge */}
          <div
            className="hidden sm:flex items-center gap-1 h-7 px-2 sm:px-2.5 rounded-md bg-[#FAF7F2] border border-[#D8CFC2]/80 text-[10.5px] font-medium text-[#555048] shadow-2xs select-none"
            title="Private session: chat history is stored locally in your browser, and requests proxy directly to OpenRouter without database logging."
          >
            <ShieldCheck className="w-3 h-3 text-[#536E59] shrink-0" />
            <span className="tracking-tight text-[#4F4A42]">Private Session</span>
          </div>
        </div>
      </header>

      {/* Main Messages Scroll Area - Ivory Canvas #F8F5EF */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-6 space-y-6">
        {!hasMessages ? (
          /* Empty State */
          <div className={`${isWideLayout ? "max-w-4xl" : "max-w-3xl"} mx-auto py-7 sm:py-9 px-4 text-center`}>
            <div className="w-10 h-10 rounded-xl bg-[#FFFCF7] border border-[#D8CFC2] flex items-center justify-center mx-auto mb-2.5 text-[#536E59] shadow-xs">
              <Sparkles className="w-4.5 h-4.5" />
            </div>

            <h3 className="text-base sm:text-lg font-medium text-[#302D29] mb-1">
              Welcome to ThreadLine
            </h3>
            <p className="text-xs text-[#625D55] max-w-md mx-auto mb-4 leading-relaxed">
              {activeModel.isImageGenerator
                ? "Describe a new image in words. This model creates images from text prompts only."
                : "A calm workspace for text correction, writing refinement, email drafting, application coding, and creative reasoning. Choose a starter below or type your prompt to begin."}
            </p>

            {/* Category Filter Pills */}
            {!activeModel.isImageGenerator && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3.5 sm:mb-4">
              {STARTER_CATEGORIES.filter((cat) =>
                activeModel.isImageGenerator
                  ? cat.id === "image-generation"
                  : cat.id !== "image-generation"
              ).map((cat) => {
                const isSelected = selectedStarterCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryOverride(cat.id);
                      if (starterScrollRef.current) {
                        starterScrollRef.current.scrollTop = 0;
                      }
                      setCanScrollUp(false);
                      setCanScrollDown(true);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition duration-150 cursor-pointer border ${
                      isSelected
                        ? "bg-[#536E59] text-white border-[#536E59] shadow-2xs"
                        : "bg-[#FFFCF7] text-[#625D55] border-[#D8CFC2] hover:bg-[#F0E9DE] hover:text-[#302D29] hover:border-[#536E59]/40"
                    }`}
                  >
                    {renderCategoryIcon(cat.iconName, "w-3 h-3")}
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
            )}

            {/* Quick Starter Suggestions - Max 4 visible at once with cool fade-away scroll */}
            <div className="mb-3.5 sm:mb-4">
              {/* Scroll Viewport Wrapper with Scoped Fade Overlays */}
              <div className="relative">
                {/* Fade Overlays (Ivory ambient blend scoped strictly to the scroll area) */}
                {hasStarterScroll && canScrollUp && (
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#F8F5EF] to-transparent z-10" />
                )}
                {hasStarterScroll && canScrollDown && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#F8F5EF] to-transparent z-10" />
                )}

                {/* Scroll Container with CSS mask-image fade */}
                <div
                  ref={starterScrollRef}
                  onScroll={handleStarterScroll}
                  className={`${
                    hasStarterScroll
                      ? "h-[244px] overflow-y-auto pr-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                      : "h-auto"
                  }`}
                  style={
                    hasStarterScroll
                      ? {
                          maskImage: `linear-gradient(to bottom, ${
                            canScrollUp ? "transparent 0px, black 24px" : "black 0px"
                          }, ${
                            canScrollDown
                              ? "black calc(100% - 30px), transparent 100%"
                              : "black 100%"
                          })`,
                          WebkitMaskImage: `linear-gradient(to bottom, ${
                            canScrollUp ? "transparent 0px, black 24px" : "black 0px"
                          }, ${
                            canScrollDown
                              ? "black calc(100% - 30px), transparent 100%"
                              : "black 100%"
                          })`,
                        }
                      : undefined
                  }
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                    {currentStarterPrompts.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectStarterPrompt(item.prompt)}
                        className="group relative px-3 py-2.5 rounded-xl border border-[#D8CFC2] bg-[#FFFCF7] hover:bg-[#F2ECE2] hover:border-[#536E59]/50 text-left transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99] flex flex-col justify-between h-[100px] shrink-0"
                      >
                        <div className="w-full">
                          <div className="flex items-center justify-between gap-1.5 mb-1.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold tracking-wide uppercase bg-[#EAE2D5]/80 text-[#4E6754]">
                              {renderCategoryIcon(
                                getPromptCategoryIcon(item.category),
                                "w-2.5 h-2.5"
                              )}
                              {item.categoryLabel}
                            </span>
                            <span className="text-[10px] sm:text-[10.5px] font-medium text-[#536E59] opacity-75 group-hover:opacity-100 flex items-center gap-0.5 transition-all shrink-0">
                              Use <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-[#2D2A26] mb-1 group-hover:text-[#1F1C19] leading-snug truncate">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-[#666056] leading-snug line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scroll Indicator & Controls Bar */}
              {hasStarterScroll && (
                <div className="flex items-center justify-between mt-2.5 px-0.5 text-[11px] text-[#787167]">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#536E59] animate-pulse" />
                    <span className="hidden sm:inline">Showing 4 of {currentStarterPrompts.length} templates</span>
                    <span className="sm:hidden">{currentStarterPrompts.length} templates</span>
                    <span className="text-[#9E9689] font-normal hidden md:inline">(scroll or use arrows)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!canScrollUp}
                      onClick={() => handleScrollPrompts("up")}
                      className={`p-1 rounded-md border transition-all ${
                        canScrollUp
                          ? "bg-[#FFFCF7] border-[#D8CFC2] hover:bg-[#EDE7DC] text-[#4E6754] cursor-pointer shadow-2xs active:scale-95"
                          : "bg-transparent border-transparent text-[#B5ADA1] cursor-not-allowed opacity-30"
                      }`}
                      title="Scroll up"
                      aria-label="Scroll up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!canScrollDown}
                      onClick={() => handleScrollPrompts("down")}
                      className={`p-1 rounded-md border transition-all ${
                        canScrollDown
                          ? "bg-[#FFFCF7] border-[#D8CFC2] hover:bg-[#EDE7DC] text-[#4E6754] cursor-pointer shadow-2xs active:scale-95"
                          : "bg-transparent border-transparent text-[#B5ADA1] cursor-not-allowed opacity-30"
                      }`}
                      title="Scroll down"
                      aria-label="Scroll down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Message List */
          <div className={`${contentWidthClass} space-y-4`}>
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              const isLastMessage = index === messages.length - 1;

              return (
                <div
                  key={message.id || index}
                  className={`flex gap-3 text-sm ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-md bg-[#FFFCF7] border border-[#D8CFC2] flex items-center justify-center shrink-0 mt-0.5 text-[#536E59] shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`rounded-xl px-4 py-3.5 border transition-all duration-150 ${
                      isUser
                        ? "max-w-[88%] sm:max-w-[80%] lg:max-w-[75%] bg-[#FFFCF7] border-[#D8CFC2] text-[#302D29] shadow-xs"
                        : message.isError
                        ? "flex-1 min-w-0 bg-[#F5ECE8] border-[#A4715E] text-[#A4715E]"
                        : "flex-1 min-w-0 bg-[#EDE7DC] border-[#D8CFC2] text-[#302D29] shadow-xs"
                    }`}
                  >
                      {/* Assistant Message Model Attribution Badge */}
                      {!isUser && (
                        <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-[#D8CFC2] text-[11px] text-[#625D55] flex-wrap">
                          {message.modelId && (
                            <>
                              <span className="font-medium text-[#536E59]">
                                {message.modelName || message.modelId}
                              </span>
                              <span>•</span>
                              <span className="font-mono text-[10px] text-[#716B62]">
                                {message.modelId}
                              </span>
                            </>
                          )}
                          {message.isWebSearch && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-[#EDF3EB] text-[#536E59] border border-[#536E59]/30 font-medium">
                              <Globe className="w-2.5 h-2.5" />
                              <span>Web</span>
                            </span>
                          )}
                          {message.translation && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#E4DDD2] text-[#536E59] border border-[#536E59]/30 font-medium">
                              <Languages className="w-2.5 h-2.5 text-[#536E59]" />
                              <span>{message.translation.sourceName} → {message.translation.targetName}</span>
                            </span>
                          )}
                          {message.modelProvider && (
                            <span className="ml-auto text-[10px] px-1.5 py-0.2 rounded bg-[#F0E9DE] text-[#625D55] border border-[#D8CFC2] font-mono">
                              {message.modelProvider}
                            </span>
                          )}
                        </div>
                      )}

                    {/* Image Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2.5 mb-3">
                        {message.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="relative rounded-lg overflow-hidden border border-[#D8CFC2] bg-[#FFFCF7] shadow-2xs"
                          >
                            {att.dataUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewModalImage({
                                    src: att.dataUrl!,
                                    name: att.name,
                                    size: att.size,
                                    width: att.width,
                                    height: att.height,
                                  })
                                }
                                className="block text-left cursor-zoom-in relative group/img focus:outline-none"
                                title="Click to view full size"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={att.dataUrl}
                                  alt={att.name}
                                  className="max-w-[260px] max-h-[200px] object-cover rounded transition duration-150 group-hover/img:brightness-95"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 text-white text-[11px] font-medium shadow-md backdrop-blur-xs">
                                    <ZoomIn className="w-3.5 h-3.5" />
                                    <span>View Full</span>
                                  </span>
                                </div>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#302D29]">
                                <FileQuestion className="w-3.5 h-3.5 text-[#536E59]" />
                                <span className="font-mono text-[11px]">
                                  {att.name} (Attached in session)
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Context Warning if older image was pruned to fit Vercel budget */}
                    {message.contextWarning && (
                      <div className="flex items-center gap-1.5 p-2 mb-2 rounded bg-[#F5ECE8] border border-[#A4715E]/40 text-[11px] text-[#A4715E]">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{message.contextWarning}</span>
                      </div>
                    )}

                    {/* Content Rendering */}
                    {isUser && editingMessageId === message.id ? (
                      /* Inline Edit Mode */
                      <div className="space-y-2.5">
                        <textarea
                          value={editInputText}
                          onChange={(e) => setEditInputText(e.target.value)}
                          className="w-full min-h-[72px] p-2.5 text-[13.5px] leading-relaxed rounded-lg border border-[#536E59] bg-[#FFFCF7] text-[#302D29] focus:outline-none focus:ring-2 focus:ring-[#536E59]/20 resize-y font-sans"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              if (editInputText.trim() && !isStreaming) {
                                handleSaveEditPrompt(message.id);
                              }
                            } else if (e.key === "Escape") {
                              setEditingMessageId(null);
                            }
                          }}
                        />
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setEditingMessageId(null)}
                            className="px-2.5 py-1 rounded-md border border-[#D8CFC2] bg-[#FAF7F2] hover:bg-[#F0E9DE] text-[#625D55] hover:text-[#302D29] transition cursor-pointer font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!editInputText.trim() || isStreaming}
                            onClick={() => handleSaveEditPrompt(message.id)}
                            className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                              !editInputText.trim() || isStreaming
                                ? "bg-[#E2DAD0] text-[#867E74] border border-[#D8CFC2] cursor-not-allowed"
                                : "bg-[#536E59] hover:bg-[#405845] text-[#FFFCF7] shadow-2xs"
                            }`}
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    ) : isUser ? (
                      <div>
                        <p className="whitespace-pre-wrap leading-relaxed text-[13.5px] text-[#302D29]">
                          {message.content}
                        </p>

                        {/* User Prompt Footer: Timestamp + Edit Query + Copy Button */}
                        <div className="mt-2.5 flex items-center justify-end gap-1 text-xs select-none">

                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-[#787167] font-normal tabular-nums leading-none tracking-tight mr-1 h-6 inline-flex items-center">
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>

                            <div className="flex items-center gap-0.5">
                              {/* Edit Query Button */}
                              <div className="relative group/tooltip flex items-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMessageId(message.id);
                                    setEditInputText(message.content);
                                  }}
                                  disabled={isStreaming}
                                  className={`w-6 h-6 rounded-md flex items-center justify-center text-[#716B62] hover:text-[#302D29] hover:bg-[#F0E9DE] transition-colors cursor-pointer ${
                                    isStreaming ? "opacity-40 cursor-not-allowed" : ""
                                  }`}
                                  title="Edit query"
                                  aria-label="Edit query"
                                >
                                  <Pencil className="w-3.5 h-3.5" strokeWidth={1.8} />
                                </button>
                                {/* Hover Tooltip */}
                                <div className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[#2D2A26] text-[#FFFCF7] text-[10px] font-medium whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 shadow-md z-30">
                                  Edit query
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#2D2A26]" />
                                </div>
                              </div>

                              {/* Copy Button */}
                              <div className="relative group/tooltip flex items-center">
                                <button
                                  type="button"
                                  onClick={() => handleCopyMessage(message.content, message.id)}
                                  className="w-6 h-6 rounded-md flex items-center justify-center text-[#716B62] hover:text-[#302D29] hover:bg-[#F0E9DE] transition-colors cursor-pointer"
                                  title="Copy query"
                                  aria-label="Copy query"
                                >
                                  {copiedMessageId === message.id ? (
                                    <Check className="w-3.5 h-3.5 text-[#536E59]" strokeWidth={2} />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" strokeWidth={1.8} />
                                  )}
                                </button>
                                {/* Hover Tooltip */}
                                <div className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[#2D2A26] text-[#FFFCF7] text-[10px] font-medium whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 shadow-md z-30">
                                  {copiedMessageId === message.id ? "Copied" : "Copy"}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#2D2A26]" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : message.isError ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-medium text-xs text-[#A4715E]">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Generation Error</span>
                        </div>
                        <p className="text-xs text-[#A4715E] whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                    ) : (() => {
                      const parsed = parseThinkingContent(message.content);
                      const isWaitingFirstToken =
                        isStreaming &&
                        isLastMessage &&
                        (!message.content || message.content.trim().length === 0);
                      const isThinking =
                        isStreaming &&
                        isLastMessage &&
                        parsed.isStillThinking;

                      if (isThinking) {
                        return (
                          <ThinkingIndicator
                            modelName={message.modelName || activeModel.name}
                            modelProvider={message.modelProvider || activeModel.provider}
                            streamingThoughts={parsed.thinking}
                            startedAt={message.createdAt}
                          />
                        );
                      }

                      if (isWaitingFirstToken) {
                        if (activeModel.isImageGenerator) {
                          return (
                            <div className="flex items-center gap-2 py-1 text-xs text-[#536E59] font-medium animate-pulse">
                              <Sparkles className="w-3.5 h-3.5 animate-spin text-[#536E59]" style={{ animationDuration: "3s" }} />
                              <span>Generating image with Recraft V4.1 Flash...</span>
                            </div>
                          );
                        }

                        if (isSearchingWeb) {
                          return (
                            <div className="flex items-center gap-2 py-1 text-xs text-[#536E59] font-medium animate-pulse">
                              <Globe className="w-3.5 h-3.5 animate-spin text-[#536E59]" style={{ animationDuration: "3s" }} />
                              <span>Searching the web...</span>
                            </div>
                          );
                        }

                        return (
                          <div className="flex items-center gap-2 py-1 text-xs text-[#536E59]">
                            <span
                              className="w-2 h-2 rounded-full bg-[#536E59] animate-bounce"
                              style={{ animationDelay: "-0.3s" }}
                            />
                            <span
                              className="w-2 h-2 rounded-full bg-[#536E59] animate-bounce"
                              style={{ animationDelay: "-0.15s" }}
                            />
                            <span
                              className="w-2 h-2 rounded-full bg-[#536E59] animate-bounce"
                            />
                            <span className="text-[11px] text-[#716B62] ml-1">Writing answer...</span>
                          </div>
                        );
                      }

                      return (
                        <div>
                          {parsed.thinking && (
                            <CompletedThoughtProcess thoughts={parsed.thinking} />
                          )}

                          {/* Generated Image Cards with Interactive Display, Download & Tools */}
                          {message.generatedImages && message.generatedImages.length > 0 && (
                            <div className="space-y-3 mb-3">
                              {message.generatedImages.map((genImg) => (
                                <GeneratedImageCard
                                  key={genImg.id}
                                  image={genImg}
                                  onOpenLightbox={(img) =>
                                    setPreviewModalImage({
                                      src: img.src,
                                      name: img.name,
                                      width: img.width,
                                      height: img.height,
                                    })
                                  }
                                />
                              ))}
                            </div>
                          )}

                          {parsed.content ? (
                            <MarkdownRenderer
                              content={
                                message.generatedImages && message.generatedImages.length > 0
                                  ? parsed.content.replace(/!\[(.*?)\]\([^)]+\)/g, "").trim()
                                  : parsed.content
                              }
                              sources={message.sources}
                              onOpenLightbox={(img) =>
                                setPreviewModalImage({
                                  src: img.src,
                                  name: img.name,
                                })
                              }
                            />
                          ) : null}

                          {/* Web Search Sources Section (hidden by default, expandable) */}
                          {message.sources && message.sources.length > 0 && (
                            <WebSearchSources sources={message.sources} />
                          )}

                          {message.isWebSearch && (!message.sources || message.sources.length === 0) && !message.isError && (
                            <div className="mt-2.5 p-2 rounded-lg bg-[#FAF7F2] border border-[#D8CFC2] flex items-center gap-2 text-xs text-[#625D55]">
                              <Globe className="w-3.5 h-3.5 text-[#716B62] shrink-0" />
                              <span>Web search was active, but no direct sources were found for this query.</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Bouncing Balls Generation Indicator */}
                    {isStreaming &&
                      isLastMessage &&
                      message.role === "assistant" &&
                      message.content &&
                      !parseThinkingContent(message.content).isStillThinking && (
                        <span
                          className="inline-flex items-center gap-1 ml-1.5 align-middle py-0.5"
                          title="Generating response..."
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-[#536E59] animate-bounce"
                            style={{ animationDelay: "-0.3s" }}
                          />
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-[#536E59] animate-bounce"
                            style={{ animationDelay: "-0.15s" }}
                          />
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-[#536E59] animate-bounce"
                          />
                        </span>
                      )}

                    {/* Actions on Assistant Message */}
                    {!isUser && !isStreaming && (
                      <div className="mt-3 pt-2 border-t border-[#D8CFC2]/70 flex items-center justify-between text-xs">
                        <span className="text-[10px] text-[#716B62]">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(message.content, message.id)}
                            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded hover:bg-[#F0E9DE] text-[#625D55] hover:text-[#302D29] transition cursor-pointer"
                            title="Copy response"
                          >
                            {copiedMessageId === message.id ? (
                              <>
                                <Check className="w-3 h-3 text-[#536E59]" />
                                <span className="text-[#536E59]">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-[#716B62]" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                          {isLastMessage && (
                            <button
                              type="button"
                              onClick={onRetry}
                              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded hover:bg-[#F0E9DE] text-[#625D55] hover:text-[#302D29] transition cursor-pointer"
                              title="Regenerate this response"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Retry</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-md bg-[#EDE7DC] border border-[#D8CFC2] flex items-center justify-center shrink-0 mt-0.5 text-[#625D55]">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Controls & Input Area - Floats above the canvas instead of a boxed section */}
      <div className="shrink-0 bg-gradient-to-t from-[#F8F5EF] via-[#F8F5EF]/95 to-transparent pt-2 pb-3 sm:pb-5 px-3 sm:px-4 z-10">
        <div className={`${contentWidthClass} space-y-2.5`}>
          {/* Prominent Model Selector positioned immediately above chatbox */}
          <ModelSelector
            selectedModelId={selectedModelId}
            onSelectModel={handleSelectModel}
            disabled={isStreaming}
          />

          {/* Image Compression Error Banner */}
          {imageError && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#F5ECE8] border border-[#A4715E] text-xs text-[#A4715E]">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{imageError}</span>
              </div>
              <button
                onClick={() => setImageError(null)}
                className="hover:text-[#302D29] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Pending Images Preview Bar */}
          {activeModel.supportsImages && attachedImages.length > 0 && (
            <div className="flex flex-wrap gap-2.5 p-2.5 rounded-lg bg-[#FFFCF7] border border-[#D8CFC2] shadow-xs">
              {attachedImages.map((img) => (
                <div
                  key={img.id}
                  className="relative group/thumb rounded-lg overflow-hidden border border-[#D8CFC2] bg-[#F0E9DE] shrink-0 shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (img.dataUrl) {
                        setPreviewModalImage({
                          src: img.dataUrl,
                          name: img.name,
                          size: img.size,
                          width: img.width,
                          height: img.height,
                        });
                      }
                    }}
                    className="block cursor-zoom-in relative focus:outline-none"
                    title="Click to preview full size"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-18 h-18 sm:w-20 sm:h-20 object-cover transition duration-150 group-hover/thumb:brightness-95"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/25 transition-all flex items-center justify-center opacity-0 group-hover/thumb:opacity-100">
                      <span className="p-1.5 rounded-full bg-black/70 text-white shadow-md">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAttachedImage(img.id);
                    }}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-[#A4715E] text-white transition cursor-pointer z-10 shadow-sm"
                    title="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-black/70 px-1 py-0.5 text-[9px] text-[#FFFCF7] font-mono truncate text-center pointer-events-none">
                    {Math.round(img.size / 1024)} KB
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Aspect Ratio Selector Bar (Visible when Image Generator model is active) */}
          {activeModel.isImageGenerator && (
            <div className="space-y-1.5">
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#D8CFC2] text-xs shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-semibold text-[#536E59] uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#536E59]" />
                  Aspect Ratio:
                </span>
                <div className="flex items-center gap-1">
                  {ASPECT_RATIO_OPTIONS.map((opt) => {
                    const isSelected = activeAspectRatio === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectAspectRatio(opt.id)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer border ${
                          isSelected
                            ? "bg-[#536E59] text-[#FFFCF7] border-[#536E59] shadow-2xs"
                            : "bg-[#FFFCF7] text-[#625D55] border-[#D8CFC2] hover:bg-[#F0E9DE] hover:text-[#302D29]"
                        }`}
                        title={opt.description}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <span className="text-[10px] text-[#716B62] font-mono hidden sm:inline">
                {activeModel.name} (~1.5s raster)
              </span>
            </div>
            <p className="px-1 text-[10.5px] text-[#716B62]">Text to image only · Image uploads and editing are unavailable.</p>
            </div>
          )}

          {/* Input Form - Floating Raised Surface */}
          <form
            onSubmit={handleSubmit}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex flex-col rounded-2xl border transition-all duration-200 shadow-md hover:shadow-lg ${
              isDraggingOver
                ? "border-[#536E59] bg-[#EDF3EB]"
                : "border-[#D8CFC2] bg-[#FFFCF7]"
            } focus-within:shadow-lg focus-within:border-[#536E59] focus-within:ring-2 focus-within:ring-[#536E59]/20`}
          >
            {previousInputText !== null && previousInputText !== inputText && (
              <div className="flex items-center justify-between gap-2 px-3.5 py-1.5 border-b border-[#D8CFC2]/70 bg-[#EDF3EB] rounded-t-2xl text-[11px] text-[#405845]">
                <span>Ready to improve · Review before sending</span>
                <button
                  type="button"
                  onClick={handleUndoRefine}
                  className="shrink-0 font-medium hover:underline cursor-pointer"
                >
                  Restore draft
                </button>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                isTranslateEnabled && !activeModel.isImageGenerator
                  ? `Enter text to translate (${getLanguageName(translateSource)} → ${getLanguageName(translateTarget)})...`
                  : activeModel.isImageGenerator
                  ? hasMessages
                    ? "Ask a follow-up or describe another image..."
                    : `Describe the image you want to generate with ${activeModel.name}... (e.g. A serene mountain lake at golden hour, digital art)`
                  : hasMessages
                  ? "Ask a follow-up"
                  : activeModel.supportsImages
                  ? `Message ${activeModel.name}... (paste images with Ctrl+V)`
                  : `Message ${activeModel.name}... (Shift+Enter for newline)`
              }
              rows={1}
              className="w-full bg-transparent px-3.5 py-3 text-sm text-[#302D29] placeholder-[#716B62] focus:outline-none resize-none max-h-48 leading-relaxed font-sans"
            />

            <div className="flex items-center justify-between px-3 py-2 border-t border-[#D8CFC2]/60 bg-[#FAF6EE] rounded-b-xl">
              <div className="flex items-center gap-1.5">
                {activeModel.supportsImages && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="image-file-input"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isStreaming || isCompressing}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs transition duration-150 ${
                        attachedImages.length > 0
                          ? "bg-[#FFFCF7] text-[#536E59] border border-[#D8CFC2]"
                          : "text-[#625D55] hover:text-[#302D29] hover:bg-[#F0E9DE]"
                      } ${
                        isStreaming || isCompressing
                          ? "opacity-40 cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                      title="Attach JPEG, PNG, or WebP image"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Attach</span>
                      {attachedImages.length > 0 && (
                        <span className="ml-0.5 font-mono text-[10px] bg-[#536E59] text-[#FFFCF7] font-semibold px-1 rounded-full">
                          {attachedImages.length}
                        </span>
                      )}
                    </button>
                  </>
                )}

                {/* Search the Web Toggle */}
                <button
                  type="button"
                  onClick={onToggleWebSearch}
                  disabled={isStreaming || Boolean(activeModel.isImageGenerator)}
                  aria-pressed={isWebSearchEnabled}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition duration-150 border ${activeModel.isImageGenerator ? "hidden" : ""} ${
                    isWebSearchEnabled && !activeModel.isImageGenerator
                      ? "bg-[#536E59] text-[#FFFCF7] border-[#536E59] shadow-2xs hover:bg-[#405845]"
                      : "bg-[#FFFCF7] text-[#625D55] border-[#D8CFC2] hover:text-[#302D29] hover:bg-[#F0E9DE] hover:border-[#536E59]/40"
                  } ${
                    isStreaming || activeModel.isImageGenerator ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                  }`}
                  title={
                    activeModel.isImageGenerator
                      ? "Web search is disabled for image generation."
                      : isWebSearchEnabled
                      ? "Search the web is ON (click to turn off)"
                      : "Search the web with Tavily (click to turn on)"
                  }
                  aria-label={
                    activeModel.isImageGenerator
                      ? "Web search is disabled for image generation."
                      : isWebSearchEnabled
                      ? "Web search is enabled. Click to disable."
                      : "Web search is disabled. Click to enable."
                  }
                >
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span>Search</span>
                  {isWebSearchEnabled && !activeModel.isImageGenerator && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A8D5B0] animate-pulse ml-0.5" />
                  )}
                </button>

                {/* Translate Toggle */}
                <button
                  type="button"
                  onClick={onToggleTranslate}
                  disabled={isStreaming || Boolean(activeModel.isImageGenerator)}
                  aria-pressed={isTranslateEnabled}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition duration-150 border ${activeModel.isImageGenerator ? "hidden" : ""} ${
                    isTranslateEnabled && !activeModel.isImageGenerator
                      ? "bg-[#536E59] text-[#FFFCF7] border-[#536E59] shadow-2xs hover:bg-[#405845]"
                      : "bg-[#FFFCF7] text-[#625D55] border-[#D8CFC2] hover:text-[#302D29] hover:bg-[#F0E9DE] hover:border-[#536E59]/40"
                  } ${
                    isStreaming || activeModel.isImageGenerator ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                  }`}
                  title={
                    activeModel.isImageGenerator
                      ? "Translation is disabled for image generation."
                      : isTranslateEnabled
                      ? "Translate is ON (click to turn off)"
                      : "Translate with Gemma 4 26B (click to turn on)"
                  }
                  aria-label={
                    activeModel.isImageGenerator
                      ? "Translation is disabled for image generation."
                      : isTranslateEnabled
                      ? "Translation is enabled. Click to disable."
                      : "Translation is disabled. Click to enable."
                  }
                >
                  <Languages className="w-3.5 h-3.5 shrink-0" />
                  <span>Translate</span>
                  {isTranslateEnabled && !activeModel.isImageGenerator && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A8D5B0] animate-pulse ml-0.5" />
                  )}
                </button>

                {/* Language Selection controls when Translate is active */}
                {isTranslateEnabled && !activeModel.isImageGenerator && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F4EFE6] border border-[#D8CFC2] text-xs shadow-2xs">
                    <select
                      value={translateSource}
                      onChange={(e) => onChangeTranslateSource?.(e.target.value)}
                      disabled={isStreaming}
                      className="bg-transparent text-[#302D29] text-xs font-medium py-0.5 px-1 rounded hover:bg-[#EAE2D5] focus:bg-[#EAE2D5] focus:outline-none cursor-pointer transition max-w-[100px] sm:max-w-none truncate"
                      title="Source language (or Auto Detect)"
                      aria-label="Source language"
                    >
                      {SOURCE_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code} className="bg-[#FFFCF7] text-[#302D29]">
                          {lang.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={onSwapTranslateLanguages}
                      disabled={translateSource === "auto" || isStreaming}
                      title={
                        translateSource === "auto"
                          ? "Cannot swap when source is Auto Detect"
                          : "Swap source and target languages"
                      }
                      className="p-1 rounded text-[#625D55] hover:text-[#302D29] hover:bg-[#EAE2D5] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                      aria-label="Swap source and target languages"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                    </button>

                    <select
                      value={translateTarget}
                      onChange={(e) => onChangeTranslateTarget?.(e.target.value)}
                      disabled={isStreaming}
                      className="bg-transparent text-[#302D29] text-xs font-medium py-0.5 px-1 rounded hover:bg-[#EAE2D5] focus:bg-[#EAE2D5] focus:outline-none cursor-pointer transition max-w-[100px] sm:max-w-none truncate"
                      title="Target language"
                      aria-label="Target language"
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code} className="bg-[#FFFCF7] text-[#302D29]">
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Quick Text Refine & Assistant Menu */}
                <div className={activeModel.isImageGenerator ? "hidden" : "relative"} ref={refineMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsRefineMenuOpen((prev) => !prev)}
                    disabled={isStreaming || Boolean(activeModel.isImageGenerator)}
                    aria-expanded={isRefineMenuOpen}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition duration-150 border ${
                      isRefineMenuOpen
                        ? "bg-[#536E59] text-[#FFFCF7] border-[#536E59] shadow-2xs"
                        : inputText.trim()
                        ? "bg-[#FFFCF7] text-[#536E59] border-[#536E59]/50 hover:bg-[#F0E9DE] hover:border-[#536E59] shadow-2xs"
                        : "bg-[#FFFCF7] text-[#625D55] border-[#D8CFC2] hover:text-[#302D29] hover:bg-[#F0E9DE] hover:border-[#536E59]/40"
                    } ${
                      isStreaming || activeModel.isImageGenerator ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                    }`}
                    title={
                      activeModel.isImageGenerator
                        ? "Text refinement is disabled for image generation."
                        : inputText.trim()
                        ? "Refine your draft: fix grammar, change tone, shorten, or summarize"
                        : "Smart writing assistant: grammar, tone, clarity & format"
                    }
                    aria-label="Text refinement assistant menu"
                  >
                    <Wand2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Refine</span>
                    {inputText.trim() && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#536E59] animate-pulse -ml-0.5" />
                    )}
                    <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${isRefineMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isRefineMenuOpen && (
                    <div
                      role="dialog"
                      aria-label="Refine your writing"
                      className="absolute bottom-full left-0 mb-2 w-[min(22rem,calc(100vw-2rem))] max-h-[min(70vh,29rem)] overflow-y-auto rounded-2xl border border-[#D8CFC2] bg-[#FFFCF7] p-3 shadow-xl z-30"
                    >
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#E7DFD3]">
                        <div>
                          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#302D29]">
                            <Wand2 className="w-3.5 h-3.5 text-[#536E59]" />
                            Refine your writing
                          </div>
                          <p className="mt-1 text-[10.5px] leading-snug text-[#716B62]">
                            {inputText.trim()
                              ? "Choose a change, review the prompt, then send."
                              : "Write or paste a draft first, then choose a change."}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsRefineMenuOpen(false)}
                          className="p-1 rounded-md text-[#716B62] hover:bg-[#F0E9DE] hover:text-[#302D29] cursor-pointer"
                          aria-label="Close Refine menu"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {previousInputText !== null && previousInputText !== inputText && (
                        <button
                          type="button"
                          onClick={handleUndoRefine}
                          className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[#536E59] hover:underline cursor-pointer"
                        >
                          <Undo2 className="w-3 h-3" />
                          Restore my draft
                        </button>
                      )}

                      <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                        {REFINE_ACTIONS.map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            disabled={!inputText.trim()}
                            onClick={() => handleApplyRefineAction(action.id)}
                            className="flex items-start gap-2 rounded-xl border border-[#E8E1D7] bg-[#FAF8F3] p-2 text-left hover:bg-[#EEF3EB] hover:border-[#C9D8C8] disabled:opacity-45 disabled:cursor-not-allowed transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#536E59]/40"
                          >
                            <span className="w-6 h-6 rounded-md bg-[#E8EFE6] text-[#536E59] flex items-center justify-center shrink-0">
                              {renderCategoryIcon(action.iconName, "w-3.5 h-3.5")}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[11px] font-semibold leading-tight text-[#302D29]">{action.label}</span>
                              <span className="block mt-0.5 text-[10px] leading-tight text-[#716B62]">{action.description}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {isCompressing && (
                  <span className="text-[11px] text-[#716B62] animate-pulse">
                    Compressing...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Stop Generation Button */}
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={onStopGeneration}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#A4715E] hover:bg-[#8E5F4E] text-[#FFFCF7] font-medium text-xs tracking-wide transition duration-150 cursor-pointer shadow-xs"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </button>
                ) : activeModel.isImageGenerator ? (
                  /* Generate Button for Image Generator Model */
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isCompressing}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium text-xs tracking-wide transition duration-150 ${
                      !inputText.trim() || isCompressing
                        ? "bg-[#E2DAD0] text-[#867E74] border border-[#D8CFC2] cursor-not-allowed"
                        : "bg-[#536E59] hover:bg-[#405845] text-[#FFFCF7] cursor-pointer shadow-xs"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate</span>
                  </button>
                ) : isTranslateEnabled && !activeModel.isImageGenerator ? (
                  /* Translate Button */
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isCompressing}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium text-xs tracking-wide transition duration-150 ${
                      !inputText.trim() || isCompressing
                        ? "bg-[#E2DAD0] text-[#867E74] border border-[#D8CFC2] cursor-not-allowed"
                        : "bg-[#536E59] hover:bg-[#405845] text-[#FFFCF7] cursor-pointer shadow-xs"
                    }`}
                    title="Translate text with Gemma 4 26B"
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>Translate</span>
                  </button>
                ) : (
                  /* Standard Send Button */
                  <button
                    type="submit"
                    disabled={
                      (!inputText.trim() && attachedImages.length === 0) ||
                      isCompressing
                    }
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium text-xs tracking-wide transition duration-150 ${
                      (!inputText.trim() && attachedImages.length === 0) ||
                      isCompressing
                        ? "bg-[#E2DAD0] text-[#867E74] border border-[#D8CFC2] cursor-not-allowed"
                        : "bg-[#536E59] hover:bg-[#405845] text-[#FFFCF7] cursor-pointer shadow-xs"
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                )}
              </div>
            </div>
          </form>

          <p className="text-[10px] text-center text-[#716B62]">
            ThreadLine communicates directly with OpenRouter via secure server-side proxy.
          </p>
        </div>
      </div>

      {/* Full-Screen Image Lightbox / Modal */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col justify-between p-3 sm:p-5 select-none animate-in fade-in duration-150"
          onClick={() => setPreviewModalImage(null)}
        >
          {/* Modal Header Bar */}
          <div
            className="flex items-center justify-between text-white px-2 py-1 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 min-w-0 max-w-[70%]">
              <span className="font-medium text-xs sm:text-sm truncate">
                {previewModalImage.name}
              </span>
              {previewModalImage.size && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/80 border border-white/15 shrink-0">
                  {Math.round(previewModalImage.size / 1024)} KB
                </span>
              )}
              {previewModalImage.width && previewModalImage.height && (
                <span className="hidden sm:inline-block text-[11px] font-mono text-white/60 shrink-0">
                  {previewModalImage.width} × {previewModalImage.height}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyPreviewImage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition cursor-pointer border border-white/15"
                title="Copy image to clipboard"
              >
                {copiedPreviewImage ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#A8D5B0]" />
                    <span className="hidden sm:inline">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadPreviewImage}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs transition cursor-pointer border border-white/15"
                title="Download image"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white hover:text-white transition cursor-pointer border border-white/15"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Image Display */}
          <div
            className="flex-1 flex items-center justify-center p-2 min-h-0 overflow-hidden"
            onClick={() => setPreviewModalImage(null)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewModalImage.src}
              alt={previewModalImage.name}
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/10 cursor-default"
            />
          </div>

          {/* Bottom Footer Hint */}
          <div className="text-center text-[11px] text-white/50 shrink-0 pb-1">
            Click anywhere outside or press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/80 font-mono text-[10px]">Esc</kbd> to close
          </div>
        </div>
      )}
    </div>
  );
}
