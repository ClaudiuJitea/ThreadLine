"use client";

import React, { useState, useEffect } from "react";
import { Conversation } from "@/lib/types";
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  LogOut,
  ChevronLeft,
  HardDrive,
  Flag,
} from "lucide-react";
import { ThreadLineLogo } from "./ThreadLineLogo";

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onToggleFlagConversation?: (id: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

function formatConversationDate(timestamp?: number): string {
  if (!timestamp) return "Recent";
  const now = Date.now();
  const diffMinutes = Math.floor((now - timestamp) / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onToggleFlagConversation,
  onLogout,
  isOpen,
  onToggleOpen,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Resizable sidebar width state with localStorage persistence
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 240;
    try {
      const saved = localStorage.getItem("threadline_sidebar_width");
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 180 && parsed <= 500) {
          // Migrate previous bulky 280 default to new compact 240
          if (parsed === 280) return 240;
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return 240;
  });

  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleResetWidth = () => {
    setWidth(240);
    try {
      localStorage.setItem("threadline_sidebar_width", "240");
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const maxWidth = Math.min(480, Math.round(window.innerWidth * 0.4));
      const minWidth = 180;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  useEffect(() => {
    if (!isResizing && width) {
      try {
        localStorage.setItem("threadline_sidebar_width", String(width));
      } catch {
        // Ignore
      }
    }
  }, [isResizing, width]);

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleSaveRename = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editingTitle.trim().length > 0) {
      onRenameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteConversation(id);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggleOpen}
          className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-30 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Unified Retractable & Resizable Sidebar Panel */}
      <aside
        style={{
          "--sidebar-width": `${width}px`,
          "--current-sidebar-width": isOpen ? `${width}px` : "46px",
        } as React.CSSProperties}
        className={`fixed top-0 bottom-0 left-0 z-40 bg-[#F3EFE7] border-r border-[#DDD5C9] flex flex-col shrink-0 select-none h-[100dvh] max-h-[100dvh] ${
          isResizing
            ? "transition-none"
            : "transition-[width,transform] duration-300 ease-in-out"
        } ${
          isOpen
            ? "translate-x-0 w-64 sm:w-68 max-w-[85vw] lg:w-[var(--current-sidebar-width)]"
            : "-translate-x-full lg:translate-x-0 w-64 sm:w-68 max-w-[85vw] lg:w-[var(--current-sidebar-width)]"
        } lg:relative lg:top-auto lg:bottom-auto lg:h-full lg:max-h-full`}
        aria-label="Sidebar navigation"
      >
        {/* Drag Resize Handle (desktop only, when expanded) */}
        {isOpen && (
          <div
            onMouseDown={handleMouseDown}
            onDoubleClick={handleResetWidth}
            className="hidden lg:flex absolute top-0 bottom-0 -right-1.5 w-3 z-30 cursor-col-resize items-center justify-center select-none group"
            title="Drag to resize sidebar (double-click to reset)"
          >
            <div
              className={`w-1 h-full transition-colors duration-150 ${
                isResizing
                  ? "bg-[#536E59] shadow-[0_0_8px_rgba(83,110,89,0.5)]"
                  : "bg-transparent group-hover:bg-[#536E59]/60"
              }`}
            />
          </div>
        )}

        {/* Toggle Sidebar Button - Centered on the boundary bar, glides with the border line */}
        <button
          type="button"
          onClick={onToggleOpen}
          className="hidden lg:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-50 w-5 h-9 rounded-full bg-[#FFFCF7] hover:bg-[#F2ECE2] border border-[#D8CFC2] hover:border-[#536E59] shadow-[0_1px_4px_rgba(48,45,41,0.06),0_1px_2px_rgba(48,45,41,0.04)] hover:shadow-[0_3px_10px_rgba(83,110,89,0.18)] items-center justify-center text-[#536E59] transition-all duration-150 cursor-pointer active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#536E59]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[#EDE7DC]"
          title={isOpen ? "Hide sidebar (Ctrl+B)" : "Expand sidebar (Ctrl+B)"}
          aria-label={isOpen ? "Hide sidebar" : "Expand sidebar"}
        >
          <ChevronLeft
            className={`w-3 h-3 text-[#536E59] transition-transform duration-300 ease-in-out ${
              isOpen
                ? "group-hover:-translate-x-0.5"
                : "rotate-180 group-hover:translate-x-0.5"
            }`}
          />
        </button>

        {/* Content container with overflow-hidden to clip overflowing content smoothly during width transition */}
        <div className="w-full h-full overflow-hidden relative">
          {/* Desktop Compacted Rail View (visible when retracted) */}
          <div
            className={`hidden lg:flex absolute inset-y-0 left-0 w-11.5 flex-col justify-between items-center py-2 z-10 select-none transition-opacity duration-200 ease-in-out ${
              isOpen ? "opacity-0 pointer-events-none" : "opacity-100 delay-100"
            }`}
          >
            {/* Top section */}
            <div className="flex flex-col items-center gap-1.5 w-full">
              {/* Header row (h-11 alignment with ChatArea header) */}
              <div className="h-11 flex items-center justify-center border-b border-[#D8CFC2]/75 w-full shrink-0 -mt-2">
                <button
                  type="button"
                  onClick={onToggleOpen}
                  className="w-7 h-7 rounded-md bg-gradient-to-br from-[#4A6450] via-[#3E5644] to-[#324637] border border-[#2D3F32] flex items-center justify-center text-[#F8F5EF] shadow-2xs cursor-pointer hover:scale-105 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#536E59]/50 shrink-0"
                  title="ThreadLine - Click to expand sidebar"
                  aria-label="ThreadLine - Click to expand sidebar"
                >
                  <ThreadLineLogo className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* New Chat Primary Action Button */}
              <button
                type="button"
                onClick={onNewChat}
                className="w-7 h-7 rounded-md bg-[#536E59] hover:bg-[#405845] text-[#FFFCF7] flex items-center justify-center shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#536E59]/50 active:scale-95 shrink-0 mt-0.5"
                title="New conversation"
                aria-label="New conversation"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* Subtle Divider */}
              <div className="w-6 h-px bg-[#D8CFC2]/75 my-0.5" aria-hidden="true" />

              {/* Recent conversation quick links */}
              <div className="flex flex-col items-center gap-1 w-full px-1 py-1.5 overflow-y-auto max-h-[calc(100vh-240px)]">
                {conversations.slice(0, 15).map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  const isFlagged = Boolean(conv.isFlagged);
                  return (
                    <div
                      key={conv.id}
                      className="relative group/rail flex items-center justify-center shrink-0 w-8.5 h-8.5"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectConversation(conv.id)}
                        className={`w-7.5 h-7.5 rounded-md flex items-center justify-center transition-all cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#536E59]/40 ${
                          isActive
                            ? isFlagged
                              ? "bg-[#FFF9F6] text-[#C06A49] font-medium border border-[#DE9E87] shadow-xs ring-1 ring-[#C06A49]/35"
                              : "bg-[#FFFCF7] text-[#536E59] font-medium border border-[#D5CDBD] shadow-xs ring-1 ring-[#536E59]/25"
                            : isFlagged
                            ? "bg-[#FAF3EE] text-[#C06A49] border border-[#E8D2C5] hover:bg-[#F6EBE2]"
                            : "text-[#716B62] hover:bg-[#F0E9DE] hover:text-[#302D29]"
                        }`}
                        title={`${conv.title}${isFlagged ? " (Flagged)" : ""}`}
                        aria-label={conv.title}
                      >
                        {isFlagged ? (
                          <Flag className="w-3.5 h-3.5 fill-current text-[#C06A49]" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5" />
                        )}
                        {isFlagged && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#C06A49] ring-1 ring-[#FFFCF7]" />
                        )}
                      </button>

                      {/* Delete conversation button in compacted rail - fully unclipped */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FFFCF7] hover:bg-[#FDF2EE] border border-[#D8CFC2] hover:border-[#A4715E] text-[#8C8478] hover:text-[#A4715E] shadow-2xs flex items-center justify-center opacity-0 group-hover/rail:opacity-100 transition-all cursor-pointer z-20 active:scale-90"
                        title={`Delete "${conv.title}"`}
                        aria-label={`Delete "${conv.title}"`}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom section */}
            <div className="flex flex-col items-center gap-1.5 w-full pt-1.5 border-t border-[#D8CFC2]/75 mt-auto pb-1">
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-[#536E59] hover:bg-[#F0E9DE] cursor-help transition-colors"
                title="Local Browser Storage: Chat history is saved solely on this device."
                aria-label="Local Browser Storage"
              >
                <HardDrive className="w-3.5 h-3.5" />
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="w-7 h-7 rounded-md hover:bg-[#F0E9DE] text-[#716B62] hover:text-[#A4715E] flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#536E59]/40"
                title="Sign Out (Owner)"
                aria-label="Sign Out"
              >
                <LogOut className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Full Sidebar View (visible when expanded) */}
          <div
            className={`w-64 sm:w-68 max-w-[85vw] lg:w-[var(--sidebar-width)] h-full flex flex-col shrink-0 min-w-0 transition-opacity duration-200 ease-in-out ${
              isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
          {/* Header aligned with the conversation header */}
          <div className="h-11 px-3 border-b border-[#E4DDD3] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 select-none">
              <div className="w-7 h-7 rounded-lg bg-[#344D3C] flex items-center justify-center text-[#F8F5EF] shadow-2xs shrink-0">
                <ThreadLineLogo className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-semibold text-[13.5px] tracking-[-0.025em] text-[#262A23] truncate">
                  ThreadLine
                </span>
                <span className="text-[9.5px] text-[#7A786F] font-normal hidden sm:inline-block">
                  Workspace
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onToggleOpen}
              className="lg:hidden w-7 h-7 rounded-md bg-[#FFFCF7] hover:bg-[#F2ECE2] border border-[#D8CFC2]/90 hover:border-[#536E59]/40 flex items-center justify-center text-[#536E59] shadow-2xs active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#536E59]/40 shrink-0"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-[#536E59]" />
            </button>
          </div>

          {/* Primary action */}
          <div className="px-2.5 py-2 shrink-0">
            <button
              type="button"
              onClick={onNewChat}
              className="w-full h-8.5 flex items-center justify-start gap-2.5 px-3 rounded-lg bg-[#405B48] hover:bg-[#334B3B] text-[#FFFCF7] font-medium text-[12px] transition duration-150 cursor-pointer shadow-[0_2px_5px_rgba(47,71,53,0.12)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#536E59]/50"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.2} />
              <span>New Conversation</span>
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 min-h-0 overflow-y-auto px-2.5 pb-2">
            <div className="flex items-center justify-between px-1.5 mb-1.5">
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#88877C]">Recent</span>
              <span className="text-[9.5px] tabular-nums text-[#929085]">{conversations.length}</span>
            </div>
            <div className="space-y-1">
            {conversations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D7D0C4] bg-[#FAF7F1]/65 text-center py-6 px-3 text-xs text-[#625D55]">
                <MessageSquare className="w-4.5 h-4.5 mx-auto mb-1.5 text-[#8B9D8C]" />
                <p className="font-medium text-[#34382F] text-[11.5px]">A fresh start</p>
                <p className="text-[10.5px] mt-0.5 text-[#7A786F]">
                  Your conversations will appear here.
                </p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const isEditing = editingId === conv.id;
                const isFlagged = Boolean(conv.isFlagged);

                return (
                  <div
                    key={conv.id}
                    className={`group relative rounded-lg transition-all duration-150 flex items-center justify-between min-h-[38px] ${
                      isActive
                        ? isFlagged
                          ? "bg-[#FFF8F5] text-[#1F1C18] border border-[#DE9E87] shadow-[0_2px_8px_rgba(192,106,73,0.14)] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r-full before:bg-[#C06A49]"
                          : "bg-[#FFFCF7] text-[#1F1C18] border border-[#DADFD2] shadow-2xs before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2.5px] before:rounded-r-full before:bg-[#536E59]"
                        : isFlagged
                        ? "bg-[#FAF2ED] text-[#2D231E] border border-[#E7D0C3] hover:bg-[#F6ECE4] hover:border-[#DE9E87] shadow-2xs before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2.5px] before:rounded-r-full before:bg-[#C06A49]/80"
                        : "border border-transparent text-[#5C564E] hover:bg-[#EAE6DD] hover:text-[#1F1C18]"
                    }`}
                  >
                    {isEditing ? (
                      <form
                        onSubmit={(e) => handleSaveRename(conv.id, e)}
                        className="flex-1 flex items-center gap-1.5 px-2 py-1"
                      >
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          autoFocus
                          className="w-full bg-[#FFFCF7] border border-[#536E59] rounded-md px-1.5 py-0.5 text-xs text-[#25221E] focus:outline-none focus:ring-1 focus:ring-[#536E59] shadow-2xs"
                        />
                        <button
                          type="submit"
                          className="w-5.5 h-5.5 rounded-md bg-[#536E59] text-white hover:bg-[#405845] flex items-center justify-center cursor-pointer transition-colors shadow-2xs shrink-0"
                          aria-label="Save title"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          className="w-5.5 h-5.5 rounded-md hover:bg-[#E8DFD0] text-[#7A7369] hover:text-[#25221E] flex items-center justify-center cursor-pointer transition-colors shrink-0"
                          aria-label="Cancel rename"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onSelectConversation(conv.id)}
                          className="flex-1 flex items-center gap-2.5 min-w-0 px-2 py-1.5 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#536E59]/40 rounded-lg touch-manipulation"
                          title={conv.title}
                          aria-label={`Open conversation: ${conv.title}`}
                        >
                          {/* Icon Container with refined badge */}
                          <div
                            className={`w-6.5 h-6.5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                              isFlagged
                                ? "bg-[#FBECE6] text-[#C06A49] border border-[#E8CEC3]"
                                : isActive
                                ? "bg-[#E7EFE4] text-[#405B48]"
                                : "bg-[#EAE6DC] group-hover:bg-[#DDE5D9] text-[#77796F] group-hover:text-[#405B48]"
                            }`}
                          >
                            {isFlagged ? (
                              <Flag className="w-3.5 h-3.5 fill-current text-[#C06A49]" />
                            ) : (
                              <MessageSquare className="w-3.5 h-3.5" />
                            )}
                          </div>

                          {/* Title and metadata */}
                          <div className="flex flex-col min-w-0 flex-1 justify-center">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`truncate text-[12px] leading-tight tracking-tight ${
                                  isActive
                                    ? "font-semibold text-[#1F1C18]"
                                    : isFlagged
                                    ? "font-semibold text-[#2D231E]"
                                    : "font-medium text-[#484239] group-hover:text-[#1F1C18]"
                                }`}
                              >
                                {conv.title}
                              </span>
                              {isFlagged && (
                                <span className="inline-flex items-center text-[9px] font-semibold tracking-wide uppercase px-1 py-0.2 rounded bg-[#F8DDD3] text-[#A84B2E] shrink-0">
                                  Flagged
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#89877D] leading-none mt-0.5 truncate flex items-center gap-1.5 font-normal">
                              <span>{formatConversationDate(conv.updatedAt || conv.createdAt)}</span>
                              {conv.messages.length > 0 && (
                                <>
                                  <span className="w-0.5 h-0.5 rounded-full bg-[#A3998C]" aria-hidden="true" />
                                  <span>
                                    {conv.messages.length} {conv.messages.length === 1 ? "msg" : "msgs"}
                                  </span>
                                </>
                              )}
                            </span>
                          </div>
                        </button>

                        {/* Action buttons (Flag, Rename, Delete) */}
                        <div className={`flex items-center gap-0.5 pr-1 transition-opacity shrink-0 ${
                          isFlagged
                            ? "opacity-100"
                            : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                        }`}>
                          {onToggleFlagConversation && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFlagConversation(conv.id);
                              }}
                              className={`w-5.5 h-5.5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                                isFlagged
                                  ? "text-[#C06A49] hover:bg-[#F4DCD5]"
                                  : "hover:bg-[#E8DFD0] text-[#7A7369] hover:text-[#C06A49]"
                              }`}
                              title={isFlagged ? "Unflag conversation" : "Flag conversation"}
                              aria-label={isFlagged ? "Unflag conversation" : "Flag conversation"}
                            >
                              <Flag
                                className={`w-2.5 h-2.5 ${
                                  isFlagged ? "fill-current text-[#C06A49]" : ""
                                }`}
                              />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => startRename(conv, e)}
                            className="w-5.5 h-5.5 rounded-md hover:bg-[#E8DFD0] text-[#7A7369] hover:text-[#1F1C18] flex items-center justify-center transition-colors cursor-pointer"
                            title="Rename chat"
                            aria-label="Rename chat"
                          >
                            <Edit2 className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(conv.id, e)}
                            className="w-5.5 h-5.5 rounded-md hover:bg-[#F4DCD5] text-[#7A7369] hover:text-[#A4715E] flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete chat"
                            aria-label="Delete chat"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
            </div>
          </div>

          {/* Workspace footer */}
          <div className="px-2.5 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] border-t border-[#E0D9CD] shrink-0 flex flex-col gap-1">
            <div className="flex items-center justify-between px-1.5 py-0.5 text-[10px] text-[#7A786F]">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3 h-3 text-[#536E59]" />
                <span className="font-medium text-[#4C594B]">Local storage</span>
              </span>
              <span className="text-[9.5px] text-[#96948A]">Private</span>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#EAE6DD] text-[#6F7167] hover:text-[#302D29] text-[11px] transition duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#536E59]/40"
            >
              <span className="flex items-center gap-1.5">
                <LogOut className="w-3 h-3" />
                Sign Out
              </span>
              <span className="text-[9.5px] text-[#96948A]">Owner</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
