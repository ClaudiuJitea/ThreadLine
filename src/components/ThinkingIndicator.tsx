"use client";

import React, { useState, useEffect, useRef } from "react";
import { Brain, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

interface ThinkingIndicatorProps {
  modelName?: string;
  modelProvider?: string;
  streamingThoughts?: string | null;
  startedAt?: number;
}

export function parseThinkingContent(
  rawContent?: string | null,
  rawReasoning?: string | null
): {
  thinking: string | null;
  content: string;
  isStillThinking: boolean;
} {
  const contentStr = rawContent || "";
  const reasoningStr = rawReasoning?.trim() || null;

  const thinkStart = contentStr.indexOf("<think>");

  if (thinkStart === -1) {
    if (reasoningStr) {
      return {
        thinking: reasoningStr,
        content: contentStr,
        isStillThinking: contentStr.trim().length === 0,
      };
    }
    return {
      thinking: null,
      content: contentStr,
      isStillThinking: false,
    };
  }

  const thinkEnd = contentStr.indexOf("</think>");
  if (thinkEnd === -1) {
    const thinkingFromContent = contentStr.slice(thinkStart + 7).trim();
    const combinedThinking = reasoningStr
      ? `${reasoningStr}\n${thinkingFromContent}`
      : thinkingFromContent;
    return {
      thinking: combinedThinking,
      content: contentStr.slice(0, thinkStart).trim(),
      isStillThinking: true,
    };
  }

  const thinkingFromContent = contentStr.slice(thinkStart + 7, thinkEnd).trim();
  const combinedThinking = reasoningStr
    ? `${reasoningStr}\n${thinkingFromContent}`
    : thinkingFromContent;
  const restContent = (
    contentStr.slice(0, thinkStart) + contentStr.slice(thinkEnd + 8)
  ).trim();

  return {
    thinking: combinedThinking,
    content: restContent,
    isStillThinking: false,
  };
}

const THINKING_PHRASES = [
  "Analyzing context & prompt nuance...",
  "Weaving reasoning threads...",
  "Exploring analytical pathways...",
  "Calibrating structured insights...",
  "Synthesizing thoughtful response...",
];

export function ThinkingIndicator({
  streamingThoughts = null,
  startedAt,
}: ThinkingIndicatorProps) {
  const [elapsed, setElapsed] = useState(0.1);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isThoughtStreamOpen, setIsThoughtStreamOpen] = useState(false);
  const startTimeRef = useRef<number>(0);

  // Live elapsed timer
  useEffect(() => {
    startTimeRef.current = startedAt || Date.now();
    const timer = setInterval(() => {
      setElapsed(Number(((Date.now() - startTimeRef.current) / 1000).toFixed(1)));
    }, 100);

    return () => clearInterval(timer);
  }, [startedAt]);

  // Rotate thought phrases smoothly
  useEffect(() => {
    const phraseTimer = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % THINKING_PHRASES.length);
    }, 2200);

    return () => clearInterval(phraseTimer);
  }, []);

  return (
    <div className="py-1 space-y-2.5">
      {/* Primary Status Line: Bouncing Balls + Elapsed Time + Brain Icon + Cycling Feedback Text */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* 3 Bouncing Balls Animation */}
          <div className="flex items-center gap-1 shrink-0 py-0.5" aria-hidden="true">
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
          </div>

          {/* Feedback Text: Thinking + Elapsed Timer + Cycling Thought Phase */}
          <div className="flex items-center gap-1.5 text-xs min-w-0 flex-wrap">
            <span className="font-semibold text-[#536E59] shrink-0">
              Thinking
            </span>
            <span className="text-[11px] font-mono text-[#716B62] shrink-0 tabular-nums">
              ({elapsed.toFixed(1)}s)
            </span>
            <span className="text-[#C4B9A9] shrink-0">•</span>
            <div className="flex items-center gap-1.5 text-[11.5px] text-[#625D55] min-w-0">
              <Brain className="w-3.5 h-3.5 text-[#536E59] shrink-0 animate-pulse" />
              <span className="italic font-medium text-[#4A453E] truncate">
                {THINKING_PHRASES[phraseIndex]}
              </span>
            </div>
          </div>
        </div>

        {/* View / Hide thoughts toggle button if streaming thoughts are available */}
        {streamingThoughts && (
          <button
            type="button"
            onClick={() => setIsThoughtStreamOpen(!isThoughtStreamOpen)}
            className="flex items-center gap-1 text-[10.5px] font-mono text-[#536E59] hover:text-[#302D29] bg-[#E4DDD2]/60 hover:bg-[#E4DDD2] px-2 py-0.5 rounded border border-[#D8CFC2] cursor-pointer shrink-0 transition"
          >
            <span>{isThoughtStreamOpen ? "Hide thoughts" : "View thoughts"}</span>
            {isThoughtStreamOpen ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* Streaming Thoughts Transcript Drawer */}
      {streamingThoughts && isThoughtStreamOpen && (
        <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#D8CFC2] max-h-48 overflow-y-auto font-mono text-[11px] text-[#625D55] leading-relaxed whitespace-pre-wrap select-text shadow-2xs">
          {streamingThoughts}
          <span className="inline-block w-1.5 h-3 ml-1 bg-[#536E59] animate-pulse align-middle" />
        </div>
      )}
    </div>
  );
}

interface CompletedThoughtProcessProps {
  thoughts: string;
}

export function CompletedThoughtProcess({
  thoughts,
}: CompletedThoughtProcessProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!thoughts || thoughts.trim().length === 0) return null;

  const handleCopyThoughts = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(thoughts);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const wordCount = thoughts.trim().split(/\s+/).length;
  const estimatedSeconds = Math.max(1, Math.round(wordCount / 25));

  return (
    <div className="mb-3 rounded-lg border border-[#D8CFC2] bg-[#FAF7F2] overflow-hidden text-xs shadow-2xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[#F0E9DE]/60 hover:bg-[#F0E9DE] transition text-left cursor-pointer text-[#625D55] hover:text-[#302D29]"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-[#536E59]" />
          <span className="font-medium text-[11px]">Thought Process</span>
          <span className="text-[10px] font-mono text-[#716B62]">
            ({estimatedSeconds}s reasoning)
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#716B62]">
          <span
            onClick={handleCopyThoughts}
            className="hover:text-[#302D29] px-1 py-0.5 rounded hover:bg-[#E4DDD2] transition flex items-center gap-1"
            title="Copy thought process"
          >
            {isCopied ? (
              <>
                <Check className="w-3 h-3 text-[#536E59]" />
                <span className="text-[#536E59]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </span>
          <span className="text-[#D8CFC2]">•</span>
          <span>{isOpen ? "Collapse" : "Expand"}</span>
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-[#D8CFC2] font-mono text-[11px] text-[#625D55] leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto bg-[#FFFCF7]">
          {thoughts}
        </div>
      )}
    </div>
  );
}
