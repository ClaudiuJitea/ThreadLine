import { WebSourceMetadata } from "../types";

/**
 * Formats inline [1], [2] citations into Markdown anchor links for valid sources.
 * Avoids touching code blocks or inline code, and leaves unknown citations (e.g. [99]) as plain text.
 */
export function formatCitationsInMarkdown(
  content: string,
  sources?: WebSourceMetadata[]
): string {
  if (!sources || sources.length === 0 || !content) {
    return content;
  }

  const validNumbers = new Set(sources.map((s) => s.number));

  // Split on code blocks and inline code to preserve them verbatim
  const parts = content.split(/(```[\s\S]*?```|`[^`\n]+`)/g);

  return parts
    .map((part) => {
      // Code blocks and inline code stay untouched
      if (
        (part.startsWith("```") && part.endsWith("```")) ||
        (part.startsWith("`") && part.endsWith("`"))
      ) {
        return part;
      }

      // Convert bracketed citations [1] to citation anchor links if number is valid
      return part.replace(/\[(\d+)\]/g, (match, numStr) => {
        const num = parseInt(numStr, 10);
        if (validNumbers.has(num)) {
          return `[${num}](#citation-${num})`;
        }
        return match;
      });
    })
    .join("");
}
