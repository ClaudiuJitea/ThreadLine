import React from "react";

interface ThreadLineLogoProps {
  className?: string;
  lineColor?: string;
  accentColor?: string;
}

/**
 * ThreadLine Logo:
 * Represents the core essence of ThreadLine — continuous threads of thought,
 * reasoning, and conversation weaving through lines of text, email drafts, and code.
 */
export function ThreadLineLogo({
  className = "w-4 h-4",
  lineColor = "currentColor",
  accentColor = "#A7C4AC",
}: ThreadLineLogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Horizontal lines of text / code / reasoning */}
      <line
        x1="3.5"
        y1="6.5"
        x2="20.5"
        y2="6.5"
        stroke={lineColor}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1="3.5"
        y1="12"
        x2="13.5"
        y2="12"
        stroke={lineColor}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1="3.5"
        y1="17.5"
        x2="20.5"
        y2="17.5"
        stroke={lineColor}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* The weaving thread looping gracefully through all three lines */}
      <path
        d="M16 3c0 4.5-8 5-8 9s8 4.5 8 9"
        stroke={accentColor}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Stitched node of thought at the central intersection */}
      <circle cx="16" cy="12" r="1.6" fill={lineColor} />
    </svg>
  );
}
