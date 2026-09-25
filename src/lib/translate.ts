export interface LanguageOption {
  code: string;
  name: string;
}

export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ro", name: "Romanian" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "ru", name: "Russian" },
  { code: "uk", name: "Ukrainian" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "zh-TW", name: "Chinese (Traditional)" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "tr", name: "Turkish" },
  { code: "hi", name: "Hindi" },
  { code: "el", name: "Greek" },
  { code: "sv", name: "Swedish" },
  { code: "da", name: "Danish" },
  { code: "no", name: "Norwegian" },
  { code: "fi", name: "Finnish" },
  { code: "cs", name: "Czech" },
  { code: "hu", name: "Hungarian" },
  { code: "he", name: "Hebrew" },
  { code: "th", name: "Thai" },
  { code: "vi", name: "Vietnamese" },
  { code: "id", name: "Indonesian" },
] as const;

export const SOURCE_LANGUAGE_AUTO: LanguageOption = {
  code: "auto",
  name: "Auto Detect",
};

export const SOURCE_LANGUAGES: readonly LanguageOption[] = [
  SOURCE_LANGUAGE_AUTO,
  ...SUPPORTED_LANGUAGES,
] as const;

export function getLanguageName(code: string): string {
  if (code === "auto") return "Auto Detect";
  const found = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  return found ? found.name : code;
}

/**
 * Builds a strict translation system prompt for Google Gemma 4 26B
 * ensuring pure translation output without conversational filler.
 */
export function buildTranslationSystemPrompt(
  sourceCode: string,
  targetCode: string
): string {
  const sourceName = getLanguageName(sourceCode);
  const targetName = getLanguageName(targetCode);

  const sourceInstruction =
    sourceCode === "auto"
      ? "Detect the source language automatically from the provided text."
      : `The source text is written in ${sourceName} (${sourceCode}).`;

  return `You are a professional, high-fidelity translation engine powered by Gemma.
Your singular task is to translate the user's text into ${targetName} (${targetCode}).
${sourceInstruction}

STRICT TRANSLATION RULES:
1. Output ONLY the translated text.
2. Do NOT add any preamble, explanations, notes, phonetic guides, greetings, conversational remarks, or conversational filler.
3. Preserve the original formatting, casing, line breaks, punctuation, markdown syntax, and code blocks exactly.
4. If the source text is already in ${targetName}, output it verbatim without commentary.`;
}
