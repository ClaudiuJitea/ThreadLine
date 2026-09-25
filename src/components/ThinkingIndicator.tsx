"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Brain, ChevronDown, ChevronUp } from "lucide-react";

interface ThinkingIndicatorProps {
  modelName?: string;
  modelProvider?: string;
  streamingThoughts?: string | null;
  startedAt?: number;
}

export function parseThinkingContent(raw: string): {
  thinking: string | null;
  content: string;
  isStillThinking: boolean;
} {
  if (!raw) {
    return { thinking: null, content: "", isStillThinking: false };
  }

  const thinkStart = raw.indexOf("<think>");
  if (thinkStart === -1) {
    return { thinking: null, content: raw, isStillThinking: false };
  }

  const thinkEnd = raw.indexOf("</think>");
  if (thinkEnd === -1) {
    const thinkingText = raw.slice(thinkStart + 7).trim();
    return {
      thinking: thinkingText,
      content: raw.slice(0, thinkStart).trim(),
      isStillThinking: true,
    };
  }

  const thinkingText = raw.slice(thinkStart + 7, thinkEnd).trim();
  const restContent = (raw.slice(0, thinkStart) + raw.slice(thinkEnd + 8)).trim();
  return {
    thinking: thinkingText,
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
  modelName = "AI Model",
  modelProvider = "AI",
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
    }, 2400);

    return () => clearInterval(phraseTimer);
  }, []);

  return (
    <div className="w-full max-w-2xl my-2 p-3.5 rounded-xl bg-[#FFFCF7] border border-[#536E59]/40 shadow-xs space-y-3 transition-all">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-[#EDF3EB] border border-[#536E59]/30 flex items-center justify-center text-[#536E59] shadow-2xs shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#DFE9DD] text-[#302D29] border border-[#536E59]/30 uppercase tracking-wider shrink-0">
              {modelProvider}
            </span>
            <span className="text-xs font-semibold text-[#302D29] truncate">
              {modelName}
            </span>
            <span className="text-[11px] text-[#536E59] font-mono shrink-0">
              is thinking ({elapsed.toFixed(1)}s)
            </span>
          </div>
        </div>

        {/* Subtle Pulsing Dots */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#536E59] animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#536E59] animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#536E59] animate-bounce" />
        </div>
      </div>

      {/* Dynamic Cycling Thought Phase */}
      <div className="flex items-center justify-between text-[11.5px] px-2.5 py-1.5 rounded-lg bg-[#F8F5EF] border border-[#D8CFC2]/70 text-[#625D55]">
        <div className="flex items-center gap-2 truncate">
          <Brain className="w-3.5 h-3.5 text-[#536E59] shrink-0 animate-pulse" />
          <span className="italic font-medium text-[#302D29] truncate">
            {THINKING_PHRASES[phraseIndex]}
          </span>
        </div>

        {streamingThoughts && (
          <button
            type="button"
            onClick={() => setIsThoughtStreamOpen(!isThoughtStreamOpen)}
            className="flex items-center gap-1 text-[10px] font-mono text-[#536E59] hover:text-[#302D29] cursor-pointer shrink-0 ml-2"
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

      {/* Active Streaming Thoughts Transcript Drawer */}
      {streamingThoughts && isThoughtStreamOpen && (
        <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#D8CFC2] max-h-44 overflow-y-auto font-mono text-[11px] text-[#625D55] leading-relaxed whitespace-pre-wrap select-text">
          {streamingThoughts}
          <span className="inline-block w-1.5 h-3 ml-1 bg-[#536E59] animate-pulse" />
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

  if (!thoughts || thoughts.trim().length === 0) return null;

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
            ({Math.max(1, Math.round(thoughts.split(/\s+/).length / 25))}s reasoning)
          </span>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-[#716B62]">
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
