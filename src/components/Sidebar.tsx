"use client";

import React, { useState, useEffect, useRef } from "react";
import { Conversation } from "@/lib/types";
import {
  MessageSquare,
  MessageCirclePlus,
  Trash2,
  Edit2,
  Check,
  X,
  LogOut,
  PanelLeft,
  HardDrive,
  Flag,
  Search,
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
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredConversations = normalizedQuery
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(normalizedQuery)
      )
    : conversations;

  const handleNewChat = () => {
    setSearchQuery("");
    onNewChat();
  };

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
        className={`fixed top-0 bottom-0 left-0 z-40 bg-[#F1EBE2] border-r border-[#D6CEC1] shadow-[1px_0_0_0_rgba(255,255,255,0.7)] flex flex-col shrink-0 select-none h-[100dvh] max-h-[100dvh] ${
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
              {/* Header row (h-10.5 alignment with ChatArea header) */}
              <div className="mx-1.5 mt-2 h-10.5 rounded-xl border border-[#D6CEC1] bg-[#ECE5DB]/85 flex items-center justify-center shrink-0 shadow-2xs group/railheader">
                <button
                  type="button"
                  onClick={onToggleOpen}
                  className="group/logo relative w-7 h-7 rounded-lg bg-[#344D3C] hover:bg-[#2A3E31] text-[#F8F5EF] flex items-center justify-center shadow-2xs cursor-pointer transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#344D3C]/50 shrink-0"
                  title="Expand sidebar (Ctrl+B)"
                  aria-label="Expand sidebar"
                >
                  {/* Default State: ThreadLine Logo */}
                  <div className="flex items-center justify-center text-[#F8F5EF] transition-all duration-150 group-hover/railheader:opacity-0 group-hover/railheader:scale-75 group-focus-visible/logo:opacity-0">
                    <ThreadLineLogo className="w-3.5 h-3.5" />
                  </div>

                  {/* Hover/Focus State: Revealed PanelLeft Button themed with logo color */}
                  <div className="absolute inset-0 flex items-center justify-center text-[#F8F5EF] opacity-0 group-hover/railheader:opacity-100 group-focus-visible/logo:opacity-100 transition-all duration-150 pointer-events-none">
                    <PanelLeft className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>

              {/* Stylish floating separator in rail view */}
              <div className="w-6 flex items-center justify-center my-1.5 shrink-0" aria-hidden="true">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-[#CEC4B4] to-transparent" />
              </div>

              {/* New chat button at top of rail */}
              <button
                type="button"
                onClick={handleNewChat}
                className="w-7 h-7 rounded-md bg-[#536E59] hover:bg-[#405845] text-[#FFFCF7] flex items-center justify-center shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#536E59]/50 active:scale-95 shrink-0"
                title="New chat"
                aria-label="New chat"
              >
                <MessageCirclePlus className="w-3.5 h-3.5" />
              </button>

              {/* Search shortcut button under New chat in rail view */}
              <button
                type="button"
                onClick={() => {
                  onToggleOpen();
                  setTimeout(() => searchInputRef.current?.focus(), 150);
                }}
                className="w-7 h-7 rounded-md hover:bg-[#F0E9DE] text-[#716B62] hover:text-[#302D29] flex items-center justify-center transition-colors cursor-pointer"
                title="Search chats"
                aria-label="Search chats"
              >
                <Search className="w-3.5 h-3.5" />
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
                        className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center transition-all cursor-pointer relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#536E59]/40 ${
                          isActive
                            ? isFlagged
                              ? "bg-[#FFF9F6] text-[#C06A49] font-medium border border-[#DE9E87] shadow-xs ring-1 ring-[#C06A49]/35"
                              : "bg-[#FFFCF7] text-[#536E59] font-medium border border-[#536E59]/45 shadow-xs ring-1 ring-[#536E59]/25"
                            : isFlagged
                            ? "bg-[#FAF3EE] text-[#C06A49] border border-[#E8D2C5] hover:bg-[#F6EBE2] shadow-2xs"
                            : "bg-[#FAF7F2]/80 border border-[#D6CEC1] text-[#716B62] hover:bg-[#FFFCF7] hover:border-[#BDB3A1] hover:text-[#302D29] shadow-2xs"
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

            {/* Stylish floating separator in rail view above bottom section */}
            <div className="w-6 flex items-center justify-center my-1.5 shrink-0 mt-auto" aria-hidden="true">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-[#CEC4B4] to-transparent" />
            </div>

            {/* Bottom section */}
            <div className="mx-1.5 mb-2 py-1.5 rounded-xl border border-[#D6CEC1] bg-[#ECE6DC]/85 flex flex-col items-center gap-1.5 w-8.5 shadow-2xs">
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
          <div className="mx-2 mt-2 h-10.5 px-3 rounded-xl border border-[#D6CEC1] bg-[#ECE5DB]/85 backdrop-blur-xs flex items-center justify-between gap-2 shrink-0 shadow-2xs">
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

            {/* Sidebar toggle button themed with logo color */}
            <button
              type="button"
              onClick={onToggleOpen}
              className="w-7 h-7 rounded-lg bg-[#344D3C] hover:bg-[#2A3E31] text-[#F8F5EF] flex items-center justify-center shadow-2xs active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#344D3C]/50 shrink-0"
              title="Close sidebar (Ctrl+B)"
              aria-label="Close sidebar"
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stylish floating separator between Header and Action Controls */}
          <div className="px-5 pt-2.5 pb-1 flex items-center justify-center shrink-0" aria-hidden="true">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-[#CEC4B4] to-transparent" />
          </div>

          {/* Top Actions: New chat button & Search chats directly underneath */}
          <div className="px-2.5 pt-1.5 pb-1.5 flex flex-col gap-2 shrink-0">
            {/* Primary Action Button - New Chat on top */}
            <button
              type="button"
              onClick={handleNewChat}
              className="w-full h-8.5 flex items-center justify-center gap-2 px-3 rounded-full bg-[#405B48] hover:bg-[#334B3B] text-[#FFFCF7] font-medium text-[12.5px] transition duration-150 cursor-pointer shadow-[0_2px_5px_rgba(47,71,53,0.12)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#536E59]/50"
              title="New chat"
              aria-label="New chat"
            >
              <MessageCirclePlus className="w-4 h-4" />
              <span>New chat</span>
            </button>

            {/* Search chats directly under New chat */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-[#88877C] pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchQuery("");
                  }
                }}
                placeholder="Search chats"
                className="w-full h-8.5 pl-8.5 pr-8 bg-[#FFFCF7] border border-[#D8CFC2] focus:border-[#536E59] rounded-full text-[12px] text-[#2D2A26] placeholder-[#8E8A81] focus:outline-none focus:ring-1 focus:ring-[#536E59]/40 transition-colors shadow-2xs"
                aria-label="Search chats"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 p-1 rounded-full hover:bg-[#EAE6DD] text-[#88877C] hover:text-[#2D2A26] cursor-pointer transition-colors"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 min-h-0 overflow-y-auto px-2.5 pt-1.5 pb-2">
            <div className="flex items-center justify-between px-1.5 py-1 mb-1.5 text-[10px]">
              <span className="font-semibold uppercase tracking-[0.11em] text-[#7A7469]">
                {normalizedQuery ? "Search Results" : "Recent"}
              </span>
              <span className="font-mono text-[9.5px] font-medium text-[#706A5F] bg-[#E3DBD0] border border-[#D5CDC0]/80 px-1.5 py-0.5 rounded-full tabular-nums leading-none">
                {normalizedQuery
                  ? `${filteredConversations.length} of ${conversations.length}`
                  : conversations.length}
              </span>
            </div>
            <div className="space-y-1.5">
            {conversations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D7D0C4] bg-[#FAF7F1]/65 text-center py-6 px-3 text-xs text-[#625D55]">
                <MessageSquare className="w-4.5 h-4.5 mx-auto mb-1.5 text-[#8B9D8C]" />
                <p className="font-medium text-[#34382F] text-[11.5px]">A fresh start</p>
                <p className="text-[10.5px] mt-0.5 text-[#7A786F]">
                  Your conversations will appear here.
                </p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D7D0C4] bg-[#FAF7F1]/65 text-center py-6 px-3 text-xs text-[#625D55]">
                <Search className="w-4.5 h-4.5 mx-auto mb-1.5 text-[#8B9D8C]" />
                <p className="font-medium text-[#34382F] text-[11.5px]">No matches found</p>
                <p className="text-[10.5px] mt-0.5 text-[#7A786F]">
                  No chat titled &ldquo;{searchQuery}&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-[11px] font-medium text-[#536E59] hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const isEditing = editingId === conv.id;
                const isFlagged = Boolean(conv.isFlagged);

                return (
                  <div
                    key={conv.id}
                    className={`group relative rounded-xl transition-all duration-150 flex items-center justify-between min-h-[40px] ${
                      isActive
                        ? isFlagged
                          ? "bg-[#FFF8F5] text-[#1F1C18] border border-[#DE9E87] shadow-[0_2px_8px_rgba(192,106,73,0.14)] ring-1 ring-[#C06A49]/20 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-full before:bg-[#C06A49]"
                          : "bg-[#FFFCF7] text-[#1F1C18] border border-[#536E59]/45 shadow-xs ring-1 ring-[#536E59]/20 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-full before:bg-[#536E59]"
                        : isFlagged
                        ? "bg-[#FAF2ED]/85 text-[#2D231E] border border-[#E5CEC1] hover:bg-[#FFF6F2] hover:border-[#DE9E87] shadow-2xs before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2.5px] before:rounded-r-full before:bg-[#C06A49]/70"
                        : "bg-[#FAF7F2]/80 hover:bg-[#FFFCF7] border border-[#D6CEC1] hover:border-[#BDB3A1] text-[#484239] hover:text-[#1F1C18] shadow-2xs hover:shadow-xs"
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
                          className="flex-1 flex items-center gap-2.5 min-w-0 px-2.5 py-1.5 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#536E59]/40 rounded-xl touch-manipulation"
                          title={conv.title}
                          aria-label={`Open conversation: ${conv.title}`}
                        >
                          {/* Icon Container with refined badge */}
                          <div
                            className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              isFlagged
                                ? "bg-[#FBECE6] text-[#C06A49] border border-[#E8CEC3]"
                                : isActive
                                ? "bg-[#E7EFE4] text-[#405B48] border border-[#C6DAC3]"
                                : "bg-[#ECE5DB] group-hover:bg-[#E3DCCE] text-[#6E6C63] group-hover:text-[#405B48] border border-[#D8CEC0]"
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
                                    : "font-medium text-[#38332B] group-hover:text-[#1F1C18]"
                                }`}
                              >
                                {conv.title}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#7C796E] leading-none mt-0.5 truncate flex items-center gap-1.5 font-normal">
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
                        <div className={`flex items-center gap-0.5 pr-1.5 transition-opacity shrink-0 ${
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
                                  : "hover:bg-[#EAE4D8] text-[#7A7369] hover:text-[#C06A49]"
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
                            className="w-5.5 h-5.5 rounded-md hover:bg-[#EAE4D8] text-[#7A7369] hover:text-[#1F1C18] flex items-center justify-center transition-colors cursor-pointer"
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

          {/* Stylish floating separator above Workspace footer */}
          <div className="px-5 pt-1 pb-2.5 flex items-center justify-center shrink-0" aria-hidden="true">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-[#CEC4B4] to-transparent" />
          </div>

          {/* Workspace footer with Storage status & Sign out */}
          <div className="mx-2 mb-2 p-2.5 rounded-xl border border-[#D6CEC1] bg-[#ECE6DC]/90 backdrop-blur-xs shrink-0 shadow-2xs">
            {/* Storage status & Sign out row */}
            <div className="flex items-center justify-between px-1.5 py-0.5 text-[10px] text-[#7A786F]">
              <span className="flex items-center gap-1.5 select-none" title="Local Browser Storage: Chat history is saved solely on this device.">
                <HardDrive className="w-3 h-3 text-[#536E59]" />
                <span className="font-medium text-[#4C594B]">Local storage</span>
                <span className="text-[9.5px] text-[#96948A]">• Private</span>
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1 text-[#6F7167] hover:text-[#A4715E] transition-colors cursor-pointer text-[10.5px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#536E59]"
                title="Sign Out (Owner)"
                aria-label="Sign Out"
              >
                <LogOut className="w-2.5 h-2.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}
