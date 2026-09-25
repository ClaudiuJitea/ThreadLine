export type RefineActionId =
  | "correction"
  | "clarity"
  | "concise"
  | "professional"
  | "friendly"
  | "bullets"
  | "expand"
  | "translate";

export const REFINE_ACTIONS: readonly {
  id: RefineActionId;
  label: string;
  description: string;
  iconName: "CheckCheck" | "Wand2" | "Feather" | "Smile" | "AlignLeft" | "Languages";
}[] = [
  { id: "correction", label: "Fix grammar", description: "Correct spelling and punctuation", iconName: "CheckCheck" },
  { id: "clarity", label: "Make clearer", description: "Use simpler, easier words", iconName: "Wand2" },
  { id: "concise", label: "Make shorter", description: "Keep the key points", iconName: "AlignLeft" },
  { id: "professional", label: "Sound professional", description: "Polite and confident", iconName: "Feather" },
  { id: "friendly", label: "Sound friendly", description: "Warm and natural", iconName: "Smile" },
  { id: "bullets", label: "Make bullet points", description: "Easy to scan", iconName: "AlignLeft" },
  { id: "expand", label: "Expand notes", description: "Turn rough notes into prose", iconName: "Wand2" },
  { id: "translate", label: "Translate to English", description: "Natural English wording", iconName: "Languages" },
];

const instructions: Record<RefineActionId, string> = {
  correction: "Correct spelling, grammar, and punctuation. Keep the writer's voice and wording wherever possible.",
  clarity: "Rewrite for clarity using plain language and a natural flow.",
  concise: "Shorten this while keeping every important point and a natural tone.",
  professional: "Rewrite in a polite, confident professional tone without sounding stiff.",
  friendly: "Rewrite in a warm, conversational tone without sounding overly familiar.",
  bullets: "Turn this into a short list of clear bullet points. Keep the key information.",
  expand: "Turn these notes into clear, complete sentences. Do not invent facts or details; leave unclear points as written.",
  translate: "Translate this into natural English while preserving the meaning and tone.",
};

export function buildRefinePrompt(action: RefineActionId, draft: string): string {
  const text = draft.trim();
  if (!text) return "";
  return `${instructions[action]} Preserve names, dates, numbers, and the intended meaning. Return only the revised text.\n\nText:\n${text}`;
}
