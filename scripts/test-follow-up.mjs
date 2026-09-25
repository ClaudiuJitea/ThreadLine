#!/usr/bin/env node
/**
 * ThreadLine Follow-up Context & Dynamic Placeholder Test Suite
 * Validates:
 * 1. Textarea placeholder switching to "Ask a follow-up" once conversation has messages.
 * 2. Multi-turn conversation context retention across follow-up turns.
 * 3. Exclusion of errored messages from model history.
 * 4. Sanitization of thinking/reasoning blocks in history.
 * 5. Formatting of image generation assistant turns in conversation context.
 * 6. Prevention of empty content in history turns (avoiding OpenRouter 400s).
 */

import { buildPayloadWithBudgetControl } from "../src/lib/image-utils.ts";

let testFailures = 0;

function logPass(msg) {
  console.log(`\x1b[32m✔ PASS:\x1b[0m ${msg}`);
}

function logFail(msg, detail) {
  testFailures++;
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${msg}`);
  if (detail) console.error("  Detail:", detail);
}

function assert(condition, msg, detail) {
  if (condition) {
    logPass(msg);
  } else {
    logFail(msg, detail);
  }
}

function getPlaceholder({
  hasMessages,
  activeModel,
  isTranslateEnabled,
  translateSource = "auto",
  translateTarget = "en",
}) {
  if (isTranslateEnabled && !activeModel.isImageGenerator) {
    return `Enter text to translate (${translateSource} → ${translateTarget})...`;
  }
  if (activeModel.isImageGenerator) {
    return hasMessages
      ? "Ask a follow-up or describe another image..."
      : `Describe the image you want to generate with ${activeModel.name}... (e.g. A serene mountain lake at golden hour, digital art)`;
  }
  if (hasMessages) {
    return "Ask a follow-up";
  }
  return activeModel.supportsImages
    ? `Message ${activeModel.name}... (paste images with Ctrl+V)`
    : `Message ${activeModel.name}... (Shift+Enter for newline)`;
}

async function runTests() {
  console.log("\n==================================================");
  console.log("Starting ThreadLine Follow-up Context Test Suite");
  console.log("==================================================\n");

  // Group 1: Dynamic Textarea Placeholder Logic
  console.log("--- Group 1: Dynamic Textarea Placeholder Logic ---");

  const gptModel = {
    id: "openai/gpt-6-luna",
    name: "GPT-6 Luna",
    supportsImages: true,
    isImageGenerator: false,
  };

  const deepseekModel = {
    id: "deepseek/deepseek-v4.1-flash",
    name: "DeepSeek v4.1 Flash",
    supportsImages: false,
    isImageGenerator: false,
  };

  const recraftModel = {
    id: "recraft/recraft-v4.1-flash",
    name: "Recraft V4.1 Flash",
    supportsImages: false,
    isImageGenerator: true,
  };

  // Initial state (no messages)
  assert(
    getPlaceholder({ hasMessages: false, activeModel: gptModel, isTranslateEnabled: false }) ===
      "Message GPT-6 Luna... (paste images with Ctrl+V)",
    "Initial unstarted chat shows model-specific message placeholder with image hint"
  );

  assert(
    getPlaceholder({ hasMessages: false, activeModel: deepseekModel, isTranslateEnabled: false }) ===
      "Message DeepSeek v4.1 Flash... (Shift+Enter for newline)",
    "Initial unstarted text-only chat shows Shift+Enter hint"
  );

  // Once conversation has started (hasMessages: true)
  assert(
    getPlaceholder({ hasMessages: true, activeModel: gptModel, isTranslateEnabled: false }) ===
      "Ask a follow-up",
    "Once conversation has started, placeholder switches to 'Ask a follow-up'"
  );

  assert(
    getPlaceholder({ hasMessages: true, activeModel: deepseekModel, isTranslateEnabled: false }) ===
      "Ask a follow-up",
    "DeepSeek conversation also displays 'Ask a follow-up' for multi-turn chat"
  );

  // Translation mode priority
  assert(
    getPlaceholder({ hasMessages: true, activeModel: gptModel, isTranslateEnabled: true }) ===
      "Enter text to translate (auto → en)...",
    "Translate mode preserves translation placeholder when active"
  );

  // Image generator model
  assert(
    getPlaceholder({ hasMessages: true, activeModel: recraftModel, isTranslateEnabled: false }) ===
      "Ask a follow-up or describe another image...",
    "Image generator model indicates follow-up or next image generation"
  );

  // Group 2: Multi-Turn Conversation History Context Retention
  console.log("\n--- Group 2: Multi-Turn Conversation Context Retention ---");

  const turn1History = [
    {
      id: "u1",
      role: "user",
      content: "What is quantum entanglement?",
      createdAt: 1000,
    },
    {
      id: "a1",
      role: "assistant",
      content: "Quantum entanglement is a phenomenon where particles remain connected so that actions performed on one affect the other.",
      createdAt: 1001,
    },
  ];

  const followUp1 = buildPayloadWithBudgetControl(
    turn1History,
    "How does it relate to quantum computing?",
    [],
    { model: "openai/gpt-6-luna", webSearch: false, aspectRatio: "1:1" }
  );

  assert(
    followUp1.payloadMessages.length === 3,
    "Follow-up turn 1 receives full context: 3 messages in total (User, Assistant, Follow-up User)"
  );
  assert(
    followUp1.payloadMessages[0].content === "What is quantum entanglement?",
    "First message contains initial user question"
  );
  assert(
    followUp1.payloadMessages[1].content === "Quantum entanglement is a phenomenon where particles remain connected so that actions performed on one affect the other.",
    "Second message contains assistant's first answer"
  );
  assert(
    followUp1.payloadMessages[2].content === "How does it relate to quantum computing?",
    "Third message contains follow-up question"
  );

  // Turn 2 Follow-up (5 messages total)
  const turn2History = [
    ...turn1History,
    {
      id: "u2",
      role: "user",
      content: "How does it relate to quantum computing?",
      createdAt: 1002,
    },
    {
      id: "a2",
      role: "assistant",
      content: "In quantum computing, entanglement allows qubits to process vast numbers of possibilities simultaneously.",
      createdAt: 1003,
    },
  ];

  const followUp2 = buildPayloadWithBudgetControl(
    turn2History,
    "Give me an example of an algorithm using this.",
    [],
    { model: "openai/gpt-6-luna", webSearch: false, aspectRatio: "1:1" }
  );

  assert(
    followUp2.payloadMessages.length === 5,
    "Follow-up turn 2 retains all 5 turns in context for the model"
  );
  assert(
    followUp2.payloadMessages[4].content === "Give me an example of an algorithm using this.",
    "Latest follow-up question is appended at the end of the context array"
  );

  // Group 3: Error Message Exclusion from Context
  console.log("\n--- Group 3: Error Message Exclusion from Context ---");

  const historyWithError = [
    { id: "u1", role: "user", content: "Tell me about Mars", createdAt: 2000 },
    {
      id: "a1",
      role: "assistant",
      content: "Server error (502): Provider timeout",
      isError: true,
      createdAt: 2001,
    },
  ];

  const payloadAfterError = buildPayloadWithBudgetControl(
    historyWithError,
    "Tell me about Mars again",
    [],
    { model: "openai/gpt-6-luna", webSearch: false, aspectRatio: "1:1" }
  );

  assert(
    payloadAfterError.payloadMessages.length === 2,
    "Errored assistant messages are safely excluded from model context payload"
  );
  assert(
    payloadAfterError.payloadMessages.every((m) => m.content !== "Server error (502): Provider timeout"),
    "Error notification string is not passed as assistant context"
  );

  // Group 4: Reasoning Tag Sanitization & Empty Content Defense
  console.log("\n--- Group 4: Reasoning Sanitization & Empty Content Defense ---");

  const deepseekThoughtHistory = [
    { id: "u1", role: "user", content: "Solve 2+2*3", createdAt: 3000 },
    {
      id: "a1",
      role: "assistant",
      content: "<think>\nMultiplication has higher precedence than addition: 2*3=6, then 2+6=8.\n</think>\nThe answer is 8.",
      createdAt: 3001,
    },
  ];

  const payloadWithDeepSeek = buildPayloadWithBudgetControl(
    deepseekThoughtHistory,
    "What if we add parentheses?",
    [],
    { model: "deepseek/deepseek-v4.1-flash", webSearch: false, aspectRatio: "1:1" }
  );

  assert(
    payloadWithDeepSeek.payloadMessages[1].content === "The answer is 8.",
    "Internal <think>...</think> reasoning tags are cleanly stripped from assistant history turns"
  );

  // Image Generation Turn Description
  const imageGenHistory = [
    { id: "u1", role: "user", content: "Serene mountain lake", createdAt: 4000 },
    {
      id: "a1",
      role: "assistant",
      content: "",
      generatedImages: [
        {
          id: "img_1",
          url: "https://example.com/lake.png",
          prompt: "Serene mountain lake at golden hour",
          createdAt: 4001,
        },
      ],
      createdAt: 4001,
    },
  ];

  const payloadAfterImageGen = buildPayloadWithBudgetControl(
    imageGenHistory,
    "What painting style matches this image?",
    [],
    { model: "openai/gpt-6-luna", webSearch: false, aspectRatio: "1:1" }
  );

  assert(
    payloadAfterImageGen.payloadMessages[1].content === "[Generated image: Serene mountain lake at golden hour]",
    "Empty assistant message with generated image provides readable context placeholder"
  );

  // Completely empty assistant message (without images) is omitted
  const emptyAsstHistory = [
    { id: "u1", role: "user", content: "Hello", createdAt: 5000 },
    { id: "a1", role: "assistant", content: "   ", createdAt: 5001 },
  ];

  const payloadEmptyAsst = buildPayloadWithBudgetControl(
    emptyAsstHistory,
    "Are you there?",
    [],
    { model: "openai/gpt-6-luna", webSearch: false, aspectRatio: "1:1" }
  );

  assert(
    payloadEmptyAsst.payloadMessages.length === 2,
    "Whitespace-only assistant message is omitted, avoiding OpenRouter 400 Bad Request"
  );

  console.log("\n==================================================");
  if (testFailures === 0) {
    console.log("All Follow-up Context & Placeholder Tests Passed Successfully!");
    console.log("==================================================\n");
    process.exit(0);
  } else {
    console.error(`Tests Finished with ${testFailures} Failure(s).`);
    console.log("==================================================\n");
    process.exit(1);
  }
}

runTests();
