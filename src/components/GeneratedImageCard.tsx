"use client";

import React, { useState } from "react";
import { GeneratedImageMetadata } from "@/lib/types";
import { downloadImage, copyImageToClipboard, formatImageFilename } from "@/lib/image-tools";
import {
  Download,
  Copy,
  Check,
  Maximize2,
  Sparkles,
  ZoomIn,
  Image as ImageIcon,
} from "lucide-react";

interface GeneratedImageCardProps {
  image: GeneratedImageMetadata;
  onOpenLightbox?: (image: {
    src: string;
    name: string;
    width?: number;
    height?: number;
  }) => void;
}

export function GeneratedImageCard({
  image,
  onOpenLightbox,
}: GeneratedImageCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "downloading" | "downloaded">("idle");
  const [copiedState, setCopiedState] = useState<"idle" | "image" | "url">("idle");
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Map aspect ratio string to CSS classes
  const getAspectRatioClass = (ratio?: string) => {
    switch (ratio) {
      case "16:9":
        return "aspect-video";
      case "9:16":
        return "aspect-[9/16]";
      case "4:3":
        return "aspect-[4/3]";
      case "3:4":
        return "aspect-[3/4]";
      case "1:1":
      default:
        return "aspect-square";
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloadState === "downloading") return;

    setDownloadState("downloading");
    const filename = formatImageFilename(image.prompt);

    try {
      await downloadImage(image.url, filename);
      setDownloadState("downloaded");
      setTimeout(() => setDownloadState("idle"), 2500);
    } catch (err) {
      console.error("Failed to download image:", err);
      setDownloadState("idle");
    }
  };

  const handleCopyImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const mode = await copyImageToClipboard(image.url);
      setCopiedState(mode);
      setTimeout(() => setCopiedState("idle"), 2500);
    } catch (err) {
      console.error("Failed to copy image:", err);
    }
  };

  const handleCopyPrompt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(image.prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (err) {
      console.error("Failed to copy prompt:", err);
    }
  };

  const handleCardClick = () => {
    if (onOpenLightbox && image.url) {
      onOpenLightbox({
        src: image.url,
        name: formatImageFilename(image.prompt),
        width: image.width,
        height: image.height,
      });
    }
  };

  return (
    <div className="my-3.5 rounded-2xl border border-[#D8CFC2] bg-[#FFFCF7] overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#FAF7F2] border-b border-[#D8CFC2] text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-[#EDF3EB] text-[#405845] border border-[#536E59]/30 uppercase tracking-wider shrink-0">
            <Sparkles className="w-2.5 h-2.5 text-[#536E59]" />
            Recraft V4.1 Flash
          </span>
          {image.aspectRatio && (
            <span className="font-mono text-[10px] text-[#716B62] px-1.5 py-0.5 rounded bg-[#F0E9DE] border border-[#D8CFC2]/70 shrink-0">
              {image.aspectRatio}
            </span>
          )}
        </div>

        {/* Top Actions: Copy Prompt */}
        <button
          type="button"
          onClick={handleCopyPrompt}
          className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded hover:bg-[#EDE7DC] text-[#625D55] hover:text-[#302D29] transition cursor-pointer border border-transparent hover:border-[#D8CFC2]"
          title="Copy the image generation prompt"
        >
          {copiedPrompt ? (
            <>
              <Check className="w-3 h-3 text-[#536E59]" />
              <span className="text-[#536E59] font-medium">Prompt Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-[#716B62]" />
              <span>Copy Prompt</span>
            </>
          )}
        </button>
      </div>

      {/* Main Image Container */}
      <div
        onClick={handleCardClick}
        className={`relative w-full max-w-[560px] mx-auto bg-[#F4EFE6] cursor-zoom-in group/img overflow-hidden ${getAspectRatioClass(
          image.aspectRatio
        )}`}
        title="Click to view full size"
      >
        {/* Skeleton Shimmer while image is loading */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#EDE7DC] animate-pulse">
            <div className="flex flex-col items-center gap-2 text-[#716B62]">
              <ImageIcon className="w-8 h-8 opacity-40 animate-bounce" />
              <span className="text-xs font-medium">Loading image preview...</span>
            </div>
          </div>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={image.prompt}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-contain transition-all duration-300 ${
            isLoaded ? "opacity-100 group-hover/img:scale-[1.01]" : "opacity-0"
          }`}
        />

        {/* Hover Action Overlay with View Full Hint */}
        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover/img:opacity-100 pointer-events-none">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 text-white text-xs font-medium shadow-lg backdrop-blur-xs">
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Click to View Full Size</span>
          </span>
        </div>
      </div>

      {/* Prompt Caption */}
      <div className="px-3.5 py-2 bg-[#FFFCF7] border-t border-[#D8CFC2]/70 text-xs">
        <p className="text-[12.5px] text-[#302D29] leading-relaxed italic line-clamp-3">
          &ldquo;{image.prompt}&rdquo;
        </p>
      </div>

      {/* Image actions: download, copy, and view */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#FAF7F2] border-t border-[#D8CFC2] text-xs">
        <div className="flex items-center gap-1.5">
          {/* 1. Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloadState === "downloading"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer shadow-xs active:scale-95 ${
              downloadState === "downloaded"
                ? "bg-[#EDF3EB] text-[#405845] border border-[#536E59]/40"
                : "bg-[#536E59] hover:bg-[#405845] text-[#FFFCF7]"
            }`}
            title="Download high-resolution image to your computer"
          >
            {downloadState === "downloaded" ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#536E59]" />
                <span>Downloaded!</span>
              </>
            ) : downloadState === "downloading" ? (
              <>
                <Download className="w-3.5 h-3.5 animate-bounce" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download Image</span>
              </>
            )}
          </button>

          {/* 2. Copy Image Button */}
          <button
            type="button"
            onClick={handleCopyImage}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer shadow-2xs hover:bg-[#F0E9DE] ${
              copiedState !== "idle"
                ? "bg-[#EDF3EB] text-[#405845] border-[#536E59]/40"
                : "bg-[#FFFCF7] text-[#625D55] border-[#D8CFC2] hover:text-[#302D29]"
            }`}
            title="Copy raster image to clipboard (paste in Discord, Slack, Docs, etc.)"
          >
            {copiedState === "image" ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#536E59]" />
                <span>Image Copied!</span>
              </>
            ) : copiedState === "url" ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#536E59]" />
                <span>URL Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy Image</span>
                <span className="sm:hidden">Copy</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* 3. Fullscreen / Lightbox Button */}
          <button
            type="button"
            onClick={handleCardClick}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#D8CFC2] bg-[#FFFCF7] hover:bg-[#F0E9DE] text-[#625D55] hover:text-[#302D29] text-xs font-medium transition cursor-pointer shadow-2xs"
            title="Open in full screen lightbox"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Full Size</span>
          </button>

        </div>
      </div>
    </div>
  );
}
