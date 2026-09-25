"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Download, ZoomIn } from "lucide-react";
import { WebSourceMetadata } from "@/lib/types";
import { formatCitationsInMarkdown } from "@/lib/search/citations";
import { downloadImage, copyImageToClipboard, formatImageFilename } from "@/lib/image-tools";

export { formatCitationsInMarkdown };

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function CodeBlock({ inline, className, children, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeString = String(children).replace(/\n$/, "");

  if (inline) {
    return (
      <code
        className="px-1.5 py-0.5 rounded text-xs font-mono bg-[#EDE7DC] text-[#536E59] border border-[#D8CFC2]"
        {...props}
      >
        {children}
      </code>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code to clipboard:", err);
    }
  };

  const lineCount = codeString.split("\n").length;

  return (
    <div className="relative my-3 rounded-lg overflow-hidden border border-[#D8CFC2] bg-[#FAF7F2] shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#EDE7DC] border-b border-[#D8CFC2] text-xs text-[#625D55]">
        <span className="font-mono text-[11px] font-medium text-[#716B62] tracking-wide uppercase">
          {language || "code"}
        </span>
      </div>
      <div className="p-3.5 overflow-x-auto text-[13px] leading-relaxed font-mono text-[#302D29] bg-[#FAF7F2]">
        <pre className="!m-0 !p-0">
          <code>{codeString}</code>
        </pre>
      </div>
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#EDE7DC]/70 border-t border-[#D8CFC2] text-xs text-[#625D55]">
        <span className="text-[10px] font-mono text-[#716B62]">
          {lineCount} {lineCount === 1 ? "line" : "lines"}
        </span>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded border border-[#D8CFC2] bg-[#FFFCF7] hover:bg-[#F0E9DE] text-[#625D55] hover:text-[#302D29] transition cursor-pointer shadow-2xs font-medium"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-[#536E59]" />
              <span className="text-[#536E59] font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-[#716B62]" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

interface MarkdownImageProps {
  src: string;
  alt?: string;
  onOpenLightbox?: (data: { src: string; name: string }) => void;
}

function MarkdownImage({ src, alt, onOpenLightbox }: MarkdownImageProps) {
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const displayName = alt || "generated-image";

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const filename = formatImageFilename(displayName);
      await downloadImage(src, filename);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch (err) {
      console.error("Failed to download image:", err);
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await copyImageToClipboard(src);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy image:", err);
    }
  };

  return (
    <div className="my-3 rounded-xl border border-[#D8CFC2] bg-[#FFFCF7] overflow-hidden shadow-xs max-w-[560px]">
      <div
        className="relative group cursor-zoom-in bg-[#F4EFE6] overflow-hidden"
        onClick={() => onOpenLightbox?.({ src, name: displayName })}
        title="Click to view full size"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={displayName}
          className="w-full max-h-[480px] object-contain transition duration-200 group-hover:scale-[1.01]"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 text-white text-xs font-medium shadow-md">
            <ZoomIn className="w-3.5 h-3.5" />
            <span>View Full Size</span>
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 bg-[#FAF7F2] border-t border-[#D8CFC2] text-xs">
        <span className="text-[11px] text-[#716B62] truncate max-w-[220px]" title={displayName}>
          {displayName}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-[#D8CFC2] bg-[#FFFCF7] hover:bg-[#F0E9DE] text-[#625D55] hover:text-[#302D29] transition cursor-pointer shadow-2xs"
            title="Copy image or URL to clipboard"
          >
            {copied ? (
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
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium border border-[#536E59] bg-[#536E59] hover:bg-[#405845] text-[#FFFCF7] transition cursor-pointer shadow-2xs"
            title="Download image"
          >
            {downloaded ? (
              <>
                <Check className="w-3 h-3" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                <span>Download</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MarkdownRenderer({
  content,
  sources,
  onOpenLightbox,
}: {
  content: string;
  sources?: WebSourceMetadata[];
  onOpenLightbox?: (data: { src: string; name: string }) => void;
}) {
  const processedContent = formatCitationsInMarkdown(content, sources);

  return (
    <div className="max-w-none text-[#302D29] text-[14px] leading-relaxed break-words space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img({ src, alt }) {
            if (!src || typeof src !== "string" || src === "[image:cached]") return null;
            return (
              <MarkdownImage
                src={src}
                alt={alt}
                onOpenLightbox={onOpenLightbox}
              />
            );
          },
          code({ className, children, ...props }) {
            const isInline = !className && !String(children).includes("\n");
            return (
              <CodeBlock
                inline={isInline}
                className={className}
                {...props}
              >
                {children}
              </CodeBlock>
            );
          },
          p({ children }) {
            return <p className="mb-2.5 last:mb-0 text-[#302D29] leading-relaxed">{children}</p>;
          },
          ul({ children }) {
            return (
              <ul className="list-disc pl-5 mb-2.5 space-y-1 text-[#302D29]">
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="list-decimal pl-5 mb-2.5 space-y-1 text-[#302D29]">
                {children}
              </ol>
            );
          },
          li({ children }) {
            return <li className="text-[#302D29]">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-[#536E59] pl-3 my-2 text-[#625D55] italic bg-[#EDE7DC]/70 py-1.5 rounded-r">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 rounded border border-[#D8CFC2]">
                <table className="w-full text-left border-collapse text-xs">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="bg-[#EDE7DC] px-3 py-2 border-b border-[#D8CFC2] text-[#302D29] font-medium">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-3 py-2 border-b border-[#D8CFC2]/60 text-[#302D29]">
                {children}
              </td>
            );
          },
          a({ href, children }) {
            // Check if this is an inline citation link
            if (href?.startsWith("#citation-")) {
              const num = parseInt(href.replace("#citation-", ""), 10);
              const source = sources?.find((s) => s.number === num);
              if (source) {
                return (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${source.title} (${source.hostname})`}
                    aria-label={`Source [${num}]: ${source.title}`}
                    className="inline-flex items-center justify-center font-mono text-[10.5px] font-semibold text-[#536E59] bg-[#EDF3EB] hover:bg-[#536E59] hover:text-[#FFFCF7] border border-[#536E59]/40 rounded px-1.5 py-0.2 mx-0.5 align-super no-underline transition cursor-pointer shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#536E59]"
                  >
                    {num}
                  </a>
                );
              }
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#536E59] hover:text-[#405845] underline underline-offset-2 transition font-medium"
              >
                {children}
              </a>
            );
          },
          h1({ children }) {
            return (
              <h1 className="text-base font-semibold text-[#302D29] mt-4 mb-2 pb-1 border-b border-[#D8CFC2]">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-sm font-semibold text-[#302D29] mt-3 mb-1.5">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-xs font-semibold text-[#536E59] mt-2.5 mb-1">
                {children}
              </h3>
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
