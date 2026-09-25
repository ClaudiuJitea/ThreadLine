export type StarterCategory =
  | "text"
  | "everyday"
  | "image-generation"
  | "mail"
  | "coding-apps"
  | "games"
  | "all"
  | "text-correction"
  | "text-improvement"
  | "text-polish";

export interface StarterPrompt {
  id: string;
  category:
    | "text"
    | "everyday"
    | "image-generation"
    | "mail"
    | "coding-apps"
    | "games";
  categoryLabel: string;
  title: string;
  description: string;
  prompt: string;
  isFeatured?: boolean;
}

export interface StarterCategoryInfo {
  id: StarterCategory;
  label: string;
  iconName:
    | "Sparkles"
    | "Mail"
    | "FileEdit"
    | "Code2"
    | "Gamepad2"
    | "Image"
    | "CheckCheck"
    | "Wand2"
    | "Feather";
}

export const STARTER_CATEGORIES: StarterCategoryInfo[] = [
  { id: "everyday", label: "Everyday", iconName: "Sparkles" },
  { id: "image-generation", label: "Image Gen", iconName: "Image" },
  { id: "text", label: "Writing", iconName: "Wand2" },
  { id: "mail", label: "Email", iconName: "Mail" },
  { id: "coding-apps", label: "Coding Apps", iconName: "Code2" },
  { id: "games", label: "Games", iconName: "Gamepad2" },
];

export const STARTER_PROMPTS: StarterPrompt[] = [
  // --- Everyday Help ---
  {
    id: "everyday-explain",
    category: "everyday",
    categoryLabel: "Everyday",
    title: "Explain Something Simply",
    description: "Understand a topic, letter, or confusing notice.",
    prompt: `Explain this in plain language for someone new to the topic. Define any important terms and give a short example if useful.\\n\\n[Paste text or describe the topic here]`,
    isFeatured: true,
  },
  {
    id: "everyday-plan",
    category: "everyday",
    categoryLabel: "Everyday",
    title: "Make a Simple Plan",
    description: "Break a goal or task into manageable steps.",
    prompt: `Help me make a realistic step-by-step plan for this goal. Keep it practical and ask about any essential missing details.\\n\\nMy goal: [Describe it]\\nTime or budget: [Optional]`,
  },
  {
    id: "everyday-compare",
    category: "everyday",
    categoryLabel: "Everyday",
    title: "Compare My Options",
    description: "See the tradeoffs between a few choices.",
    prompt: `Compare these options in a simple table with the main pros, cons, and questions I should consider. Do not assume facts I haven't provided.\\n\\nMy options: [List them]\\nWhat matters to me: [Optional]`,
  },
  {
    id: "everyday-ideas",
    category: "everyday",
    categoryLabel: "Everyday",
    title: "Give Me Ideas",
    description: "Brainstorm useful options for a real situation.",
    prompt: `Give me several practical ideas for the situation below. Include a mix of easy and creative options, with one sentence on why each might work.\\n\\nSituation: [Describe it]`,
  },
  {
    id: "everyday-list",
    category: "everyday",
    categoryLabel: "Everyday",
    title: "Organize My To-Do List",
    description: "Sort scattered tasks into a clear order.",
    prompt: `Organize these tasks into a realistic to-do list. Group related items and suggest a sensible order without inventing deadlines.\\n\\nMy tasks: [Paste your list here]`,
  },
  {
    id: "everyday-learn",
    category: "everyday",
    categoryLabel: "Everyday",
    title: "Help Me Learn a Topic",
    description: "Get a beginner-friendly starting point.",
    prompt: `Teach me the basics of this topic in plain language. Start with the big picture, then the most useful concepts and a few next steps for learning.\\n\\nTopic: [What I want to learn]`,
  },

  // --- Everyday Writing ---
  {
    id: "text-proofread",
    category: "text",
    categoryLabel: "Writing",
    title: "Fix My Writing",
    description: "Correct spelling and grammar without changing your voice.",
    prompt: `Correct spelling, grammar, and punctuation in the text below. Keep my meaning and natural voice. Return only the corrected text.\n\n[Paste your writing here]`,
    isFeatured: true,
  },
  {
    id: "text-clearer",
    category: "text",
    categoryLabel: "Writing",
    title: "Make This Clearer",
    description: "Make a message easier to understand.",
    prompt: `Rewrite the text below in plain, clear language. Keep the same meaning, names, and details. Return only the revised text.\n\n[Paste your writing here]`,
    isFeatured: true,
  },
  {
    id: "text-shorter",
    category: "text",
    categoryLabel: "Writing",
    title: "Make It Shorter",
    description: "Cut extra words while keeping the important points.",
    prompt: `Shorten the text below without losing any important information. Keep it natural and easy to read. Return only the revised text.\n\n[Paste your writing here]`,
    isFeatured: true,
  },
  {
    id: "text-friendly",
    category: "text",
    categoryLabel: "Writing",
    title: "Sound More Friendly",
    description: "Make a note or message warmer and more natural.",
    prompt: `Rewrite this message so it sounds warm, friendly, and natural. Keep the facts and my intent. Return only the revised message.\n\n[Paste your message here]`,
  },
  {
    id: "text-professional",
    category: "text",
    categoryLabel: "Writing",
    title: "Sound More Professional",
    description: "Make a work message polite and confident.",
    prompt: `Rewrite this text in a polite, confident professional tone. Avoid jargon and keep my meaning. Return only the revised text.\n\n[Paste your message here]`,
  },
  {
    id: "text-polite-firm",
    category: "text",
    categoryLabel: "Writing",
    title: "Be Polite but Firm",
    description: "Set a boundary or make a request clearly.",
    prompt: `Rewrite this message to be polite but firm. Make the request or boundary clear without sounding harsh. Keep the facts unchanged.\n\n[Paste your message here]`,
  },
  {
    id: "text-notes",
    category: "text",
    categoryLabel: "Writing",
    title: "Turn Notes into a Message",
    description: "Turn rough points into a clear paragraph.",
    prompt: `Turn these rough notes into a clear, natural message. Do not add facts that are not in my notes.\n\n[Paste your notes here]`,
  },
  {
    id: "text-bullets",
    category: "text",
    categoryLabel: "Writing",
    title: "Summarize in Bullets",
    description: "Pull out the main points from longer text.",
    prompt: `Summarize the text below in a short list of bullet points. Keep the most important facts, dates, and action items.\n\n[Paste text here]`,
  },
  {
    id: "text-simple",
    category: "text",
    categoryLabel: "Writing",
    title: "Explain in Simple Words",
    description: "Understand a confusing paragraph or notice.",
    prompt: `Explain the text below in simple everyday language. Define any necessary jargon, and point out any action I need to take.\n\n[Paste text here]`,
  },
  {
    id: "text-checklist",
    category: "text",
    categoryLabel: "Writing",
    title: "Make a Checklist",
    description: "Turn instructions or notes into steps.",
    prompt: `Turn the text below into a practical checklist in a sensible order. Use only steps supported by the text.\n\n[Paste instructions or notes here]`,
  },
  {
    id: "text-translate",
    category: "text",
    categoryLabel: "Writing",
    title: "Translate to English",
    description: "Keep the meaning and tone in natural English.",
    prompt: `Translate the following text into natural English. Keep names, numbers, and meaning accurate. Return only the translation.\n\n[Paste text here]`,
  },
  {
    id: "text-review",
    category: "text",
    categoryLabel: "Writing",
    title: "Check Before Sending",
    description: "Spot confusing or unintended wording.",
    prompt: `Review this message before I send it. Briefly flag anything unclear or easy to misread, then give me a clearer version that preserves my intent.\n\n[Paste your message here]`,
  },

  // --- Email ---
  {
    id: "mail-write",
    category: "mail",
    categoryLabel: "Email",
    title: "Write an Email",
    description: "Turn a few details into a short, natural email.",
    prompt: `Write a clear, friendly email using these details. Include a useful subject line. Ask me about any essential missing information rather than inventing it.\n\nWho it is for: [Person or group]\nWhat I need to say: [Details]`,
    isFeatured: true,
  },
  {
    id: "mail-reply",
    category: "mail",
    categoryLabel: "Email",
    title: "Reply to an Email",
    description: "Draft a helpful reply to a message you received.",
    prompt: `Draft a concise, natural reply to the email below. My main point is: [What I want to say]. Keep the tone appropriate and do not commit me to anything I did not mention.\n\nEmail I received:\n[Paste email here]`,
  },
  {
    id: "mail-proofread",
    category: "mail",
    categoryLabel: "Email",
    title: "Polish My Draft",
    description: "Fix mistakes and smooth out an email.",
    prompt: `Proofread this email and make it clear and natural. Keep my meaning and voice. Return a subject line only if one is missing.\n\n[Paste your draft here]`,
  },
  {
    id: "mail-followup",
    category: "mail",
    categoryLabel: "Email",
    title: "Send a Follow-Up",
    description: "Check in politely about an unanswered message.",
    prompt: `Write a short, polite follow-up email. Mention what I am following up on and make the next step clear without sounding pushy.\n\nWhat I sent or asked: [Details]\nWhen I sent it: [Date, if relevant]`,
  },
  {
    id: "mail-decline",
    category: "mail",
    categoryLabel: "Email",
    title: "Say No Politely",
    description: "Decline an invitation or request respectfully.",
    prompt: `Write a brief, respectful email declining this request or invitation. Keep the reason simple and do not suggest future plans unless I mention them.\n\nWhat I am declining: [Details]\nReason, if I want to share it: [Optional]`,
  },
  {
    id: "mail-request",
    category: "mail",
    categoryLabel: "Email",
    title: "Ask for Help or Information",
    description: "Make a clear request with the right context.",
    prompt: `Write a polite email asking for the help or information below. Make it easy for the recipient to understand and reply.\n\nWhat I need: [Details]\nUseful context: [Details]`,
  },
  {
    id: "mail-apology",
    category: "mail",
    categoryLabel: "Email",
    title: "Apologize and Explain",
    description: "Own a mistake and explain the next step.",
    prompt: `Write a sincere, concise apology email about the situation below. Take responsibility without making excuses or promising anything I have not confirmed.\n\nWhat happened: [Details]\nWhat I can do next: [Details]`,
  },
  {
    id: "mail-thanks",
    category: "mail",
    categoryLabel: "Email",
    title: "Write a Thank-You Note",
    description: "Send a warm and specific thank-you email.",
    prompt: `Write a short, genuine thank-you email using these details. Keep it personal and avoid exaggerated praise.\n\nWho I am thanking: [Person]\nWhat they did: [Details]`,
  },

  // --- Coding Apps ---
  {
    id: "coding-website",
    category: "coding-apps",
    categoryLabel: "Coding Apps",
    title: "Build a Modern Web Page",
    description: "Create a complete, responsive HTML web page for your portfolio, shop, or project.",
    prompt: `Create a clean, modern, and mobile-friendly web page for [my portfolio / local coffee shop / product idea]. Provide a single complete HTML file using Tailwind CSS via CDN with a hero section, feature cards, testimonials, and a working contact form.`,
    isFeatured: true,
  },
  {
    id: "coding-fix",
    category: "coding-apps",
    categoryLabel: "Coding Apps",
    title: "Fix an Error or Broken Code",
    description: "Paste any confusing error or broken code to get a plain-English explanation and clean fix.",
    prompt: `I have an error or broken code that I don't understand. Explain what is causing the problem in plain, beginner-friendly English (no confusing jargon), and provide the corrected code ready to copy and paste:\n\nError or what's happening:\n[Paste error message or describe problem]\n\nMy code:\n[Paste code here]`,
  },
  {
    id: "coding-automate",
    category: "coding-apps",
    categoryLabel: "Coding Apps",
    title: "Automate a Repetitive Task",
    description: "Get a simple script to automatically organize files, clean spreadsheets, or download data.",
    prompt: `Write a simple, beginner-friendly Python script to help me automate this task: [describe what you want to automate, e.g. organize photos by year, combine multiple Excel files, or download images from links]. Include step-by-step instructions on how to run it on my computer.`,
  },
  {
    id: "coding-explain",
    category: "coding-apps",
    categoryLabel: "Coding Apps",
    title: "Explain Code Like I'm Five",
    description: "Break down any confusing code snippet using simple analogies so anyone can understand it.",
    prompt: `Explain this code to me as if I'm a complete beginner. Use a clear real-world analogy (like cooking a recipe or organizing a room) to explain what each part does step-by-step:\n\n[Paste code snippet here]`,
  },

  // --- Games ---
  {
    id: "game-rpg",
    category: "games",
    categoryLabel: "Games",
    title: "Play a Choose-Your-Own-Adventure",
    description: "Start an interactive story where you make choices, solve mysteries, and explore.",
    prompt: `Let's play an interactive choose-your-own-adventure game! You be the storyteller/game master. Set up an intriguing scene in a world of [fantasy / mystery / sci-fi / survival], describe my character's situation, and give me 3 numbered choices for what to do next. Wait for my choice before continuing!`,
    isFeatured: true,
  },
  {
    id: "game-playable-mini",
    category: "games",
    categoryLabel: "Games",
    title: "Build a Playable Browser Mini-Game",
    description: "Get complete code for a fun game (like Snake, Pong, or Memory Match) you can play instantly.",
    prompt: `Build a complete, fully playable classic mini-game (like Snake, Pong, Tic-Tac-Toe, or a Memory Matching game) in a single HTML file with embedded CSS and JavaScript. Make the controls responsive, add a score counter, and make it look clean and modern so I can save it and play it immediately in my browser!`,
  },
  {
    id: "game-trivia",
    category: "games",
    categoryLabel: "Games",
    title: "Host a Live Trivia Quiz",
    description: "Test your knowledge with an interactive 5-question quiz with scorekeeping and fun facts.",
    prompt: `Let's play a trivia quiz game! You be the host. Ask me what topic I want to play (e.g. 90s movies, pop culture, video games, history, or science). Then give me 5 questions, one at a time, wait for my answer, tell me if I was right with a cool fun fact, and track my final score!`,
  },
  {
    id: "game-brainstorm",
    category: "games",
    categoryLabel: "Games",
    title: "Brainstorm a Fun Game Concept",
    description: "Invent a creative casual, mobile, or indie game idea with storyline, characters, and fun twists.",
    prompt: `Help me brainstorm a fun and creative video game idea! Give me 3 distinct game concepts (e.g. cozy simulation, fast-paced arcade, or comedic puzzle game). For each one, outline the story hook, the main character, what the player actually does, and the unique fun twist that makes it addictive.`,
  },

  // --- Image Generation ---
  {
    id: "img-gen-portrait",
    category: "image-generation",
    categoryLabel: "Image Gen",
    title: "Cinematic Golden Hour Portrait",
    description: "Close-up portrait with natural warmth, bokeh, and crisp details.",
    prompt: `A close-up cinematic portrait of [a person with expressive eyes], captured during golden hour, soft warm lighting, shallow depth of field, 8k photography, hyperrealistic raster detail`,
    isFeatured: true,
  },
  {
    id: "img-gen-cyberpunk",
    category: "image-generation",
    categoryLabel: "Image Gen",
    title: "Cyberpunk Rainy Street",
    description: "Atmospheric rainy city street with neon reflections and volumetric fog.",
    prompt: `A neon-lit cyberpunk alleyway in [Tokyo] at night during light rain, wet reflective asphalt, vibrant neon signage, steam rising from street vents, cinematic composition, ultra-detailed`,
  },
  {
    id: "img-gen-product",
    category: "image-generation",
    categoryLabel: "Image Gen",
    title: "Minimalist Studio Product",
    description: "Crisp commercial product photography on a smooth pastel pedestal.",
    prompt: `Commercial studio product photography of [a sleek glass perfume bottle or gadget] centered on a minimalist pastel pedestal, soft diffused studio light, clean shadows, award-winning advertising visual`,
  },
  {
    id: "img-gen-fantasy",
    category: "image-generation",
    categoryLabel: "Image Gen",
    title: "Epic Fantasy Landscape",
    description: "Sprawling ethereal mountains with ancient citadel and waterfalls.",
    prompt: `An epic fantasy landscape featuring [floating misty mountains with towering ancient castles and cascading waterfalls], dramatic sun rays piercing through clouds, majestic scale, matte painting style`,
  },
];

export function getStarterPrompts(category: StarterCategory): StarterPrompt[] {
  if (
    category === "text" ||
    category === "text-correction" ||
    category === "text-improvement" ||
    category === "text-polish"
  ) {
    return STARTER_PROMPTS.filter((p) => p.category === "text");
  }
  if (category === "all") {
    return STARTER_PROMPTS.filter((p) => p.isFeatured);
  }
  return STARTER_PROMPTS.filter((p) => p.category === category);
}
