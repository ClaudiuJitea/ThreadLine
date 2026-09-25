"use client";

import React, { useState } from "react";
import { Globe, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { WebSourceMetadata } from "@/lib/types";

interface WebSearchSourcesProps {
  sources: WebSourceMetadata[];
  defaultExpanded?: boolean;
}

export function WebSearchSources({
  sources,
  defaultExpanded = false,
}: WebSearchSourcesProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3.5 pt-2.5 border-t border-[#D8CFC2]/70">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="w-full flex items-center justify-between py-1.5 px-2 -mx-2 rounded-lg hover:bg-[#F0E9DE]/60 transition-colors text-left cursor-pointer group focus:outline-none focus:ring-1 focus:ring-[#536E59]"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#302D29]">
          <Globe className="w-3.5 h-3.5 text-[#536E59]" />
          <span>Sources</span>
          <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-[#EDF3EB] text-[#536E59] border border-[#536E59]/30">
            {sources.length}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-[#716B62] group-hover:text-[#302D29] transition-colors">
          <span>{isExpanded ? "Hide sources" : "Show sources"}</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#716B62] group-hover:text-[#302D29]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[#716B62] group-hover:text-[#302D29]" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in duration-200">
          {sources.map((source) => (
            <a
              key={source.number}
              id={`source-${source.number}`}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-2 rounded-lg border border-[#D8CFC2] bg-[#FFFCF7] hover:bg-[#F0E9DE] hover:border-[#536E59]/40 transition text-left cursor-pointer shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#536E59]"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-[#536E59]">
                  <span className="w-4 h-4 rounded-full bg-[#EDF3EB] border border-[#536E59]/30 flex items-center justify-center font-bold text-[9px]">
                    {source.number}
                  </span>
                  <span className="truncate max-w-[140px] text-[#716B62]">
                    {source.hostname}
                  </span>
                </span>
                <ExternalLink className="w-3 h-3 text-[#716B62] opacity-60 group-hover:opacity-100 group-hover:text-[#536E59] transition shrink-0" />
              </div>
              <h5 className="text-[11.5px] font-medium text-[#302D29] group-hover:text-[#23201C] line-clamp-1 leading-snug">
                {source.title}
              </h5>
              {source.snippet && (
                <p className="mt-1 text-[10.5px] text-[#625D55] line-clamp-2 leading-relaxed">
                  {source.snippet}
                </p>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
