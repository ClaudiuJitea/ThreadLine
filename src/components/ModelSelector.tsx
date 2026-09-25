"use client";

import React, { useState } from "react";
import { ALLOWED_MODELS } from "@/lib/models";
import { AllowedModelId } from "@/lib/types";
import { Check, Eye, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface ModelSelectorProps {
  selectedModelId: AllowedModelId;
  onSelectModel: (modelId: AllowedModelId) => void;
  disabled?: boolean;
  defaultCollapsed?: boolean;
}

export function ModelSelector({
  selectedModelId,
  onSelectModel,
  disabled = false,
  defaultCollapsed = false,
}: ModelSelectorProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return defaultCollapsed;
    try {
      const saved = localStorage.getItem("threadline_model_selector_collapsed");
      if (saved !== null) {
        return saved === "true";
      }
    } catch {
      // Ignore storage errors
    }
    return defaultCollapsed;
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("threadline_model_selector_collapsed", String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const activeModel =
    ALLOWED_MODELS.find((m) => m.id === selectedModelId) || ALLOWED_MODELS[0];

  return (
    <div className="w-full">
      {isCollapsed ? (
        /* Collapsed Compact View - Floating pill */
        <div
          onClick={toggleCollapse}
          className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#FFFCF7] hover:bg-[#FDF9F2] border border-[#D8CFC2] hover:border-[#536E59]/40 transition shadow-sm hover:shadow-md cursor-pointer select-none"
          title="Click to expand AI model options"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            <span className="text-[10px] font-semibold tracking-wider text-[#625D55] uppercase shrink-0">
              AI Model:
            </span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#DFE9DD] text-[#302D29] border border-[#536E59]/30 uppercase tracking-wider shrink-0">
              {activeModel.provider}
            </span>
            <span className="text-xs font-medium text-[#302D29] truncate">
              {activeModel.name}
            </span>
            <span className="text-[10px] text-[#716B62] font-mono truncate hidden md:inline">
              ({activeModel.id})
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0E9DE] text-[#625D55] border border-[#D8CFC2] shrink-0 hidden sm:inline">
              {activeModel.badge}
            </span>
            {activeModel.supportsImages && (
              <span
                className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-[#DFE9DD] text-[#302D29] border border-[#536E59]/30 shrink-0"
                title="Supports image uploads"
              >
                <Eye className="w-2.5 h-2.5 text-[#536E59]" />
                Vision
              </span>
            )}
            {activeModel.isImageGenerator && (
              <span
                className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-[#DFE9DD] text-[#302D29] border border-[#536E59]/30 shrink-0 font-medium"
                title="Generates raster images from text prompts"
              >
                <Sparkles className="w-2.5 h-2.5 text-[#536E59]" />
                Image Gen
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-[#716B62] font-mono hidden sm:inline">
              Enforced allowlist ({ALLOWED_MODELS.length} models)
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapse();
              }}
              className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-[#F0E9DE] hover:bg-[#E4DBCF] border border-[#D8CFC2] text-[#625D55] hover:text-[#302D29] transition cursor-pointer shadow-2xs"
              title="Show all AI models"
            >
              <span>Change</span>
              <ChevronUp className="w-3.5 h-3.5 text-[#625D55]" />
            </button>
          </div>
        </div>
      ) : (
        /* Expanded Full View - Floating card */
        <div className="p-3 rounded-2xl bg-[#FFFCF7] border border-[#D8CFC2] shadow-md transition">
          <div className="flex items-center justify-between mb-2 select-none">
            <button
              type="button"
              onClick={toggleCollapse}
              className="flex items-center gap-2 group cursor-pointer text-left focus:outline-none"
              title="Click to collapse model selector"
            >
              <span className="text-[11px] font-medium tracking-wide text-[#625D55] group-hover:text-[#302D29] uppercase transition">
                Select AI Model
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#EDF3EB] text-[#302D29] border border-[#536E59]/30 hidden sm:inline">
                Active: {activeModel.name}
              </span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#716B62] font-mono hidden sm:inline">
                Enforced allowlist ({ALLOWED_MODELS.length} models)
              </span>
              <button
                type="button"
                onClick={toggleCollapse}
                className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-[#FFFCF7] hover:bg-[#F0E9DE] border border-[#D8CFC2] text-[#625D55] hover:text-[#302D29] transition cursor-pointer shadow-2xs"
                title="Hide model selector to save chat space"
              >
                <span>Hide</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#625D55]" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1.5">
            {ALLOWED_MODELS.map((model) => {
              const isSelected = model.id === selectedModelId;
              return (
                <button
                  key={model.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectModel(model.id)}
                  className={`text-left px-2.5 py-1.5 rounded-lg border transition-all duration-150 relative group flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#EDF3EB] border-[#536E59] text-[#302D29] shadow-xs ring-1 ring-[#536E59]/30"
                      : "bg-[#FFFCF7] hover:bg-[#F0E9DE] border-[#D8CFC2] text-[#625D55] shadow-2xs"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`text-[9px] font-medium px-1 py-0.2 rounded border uppercase tracking-wider shrink-0 ${
                            isSelected
                              ? "bg-[#DFE9DD] text-[#302D29] border-[#536E59]/30"
                              : "bg-[#F0E9DE] text-[#625D55] border-[#D8CFC2]"
                          }`}
                        >
                          {model.provider}
                        </span>
                        <span className="font-medium text-xs text-[#302D29] truncate">
                          {model.name}
                        </span>
                      </div>

                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-[#536E59] shrink-0 stroke-[2.5]" />
                      ) : (
                        <span className="text-[9px] text-[#716B62] opacity-0 group-hover:opacity-100 transition shrink-0">
                          Select
                        </span>
                      )}
                    </div>

                    <div
                      className={`font-mono text-[9.5px] truncate ${
                        isSelected ? "text-[#536E59]" : "text-[#716B62]"
                      }`}
                    >
                      {model.id}
                    </div>
                  </div>

                  <div
                    className={`flex items-center justify-between gap-1 mt-1 pt-1 border-t ${
                      isSelected ? "border-[#536E59]/25" : "border-[#D8CFC2]/70"
                    }`}
                  >
                    <span
                      className={`text-[9.5px] truncate ${
                        isSelected ? "text-[#302D29]" : "text-[#625D55]"
                      }`}
                    >
                      {model.badge}
                    </span>
                    {model.supportsImages && (
                      <span
                        className={`inline-flex items-center gap-1 text-[8.5px] px-1 py-0.2 rounded border ${
                          isSelected
                            ? "bg-[#DFE9DD] text-[#302D29] border-[#536E59]/30"
                            : "bg-[#F0E9DE] text-[#625D55] border-[#D8CFC2]"
                        }`}
                        title="Supports image uploads"
                      >
                        <Eye className="w-2.5 h-2.5 text-[#536E59]" />
                        Vision
                      </span>
                    )}
                    {model.isImageGenerator && (
                      <span
                        className={`inline-flex items-center gap-1 text-[8.5px] px-1 py-0.2 rounded border font-medium ${
                          isSelected
                            ? "bg-[#DFE9DD] text-[#302D29] border-[#536E59]/30"
                            : "bg-[#F0E9DE] text-[#625D55] border-[#D8CFC2]"
                        }`}
                        title="Generates raster images from text prompts"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-[#536E59]" />
                        Image Gen
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
