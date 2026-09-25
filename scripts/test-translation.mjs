#!/usr/bin/env node
/**
 * ThreadLine Translation Test Suite
 * Validates:
 * 1. Dedicated Google Gemma 4 26B translation model configuration.
 * 2. Model exclusion from user-selectable dropdown list.
 * 3. Server-side allowlist acceptance.
 * 4. Language definitions (Auto Detect + supported languages).
 * 5. Strict system prompt generation for translation.
 */

import {
  ALLOWED_MODELS,
  ALLOWED_MODEL_IDS,
  TRANSLATION_MODEL_ID,
  TRANSLATION_MODEL_INFO,
  isAllowedModel,
  isTranslationModel,
  getModelInfo,
} from "../src/lib/models.ts";

import {
  SUPPORTED_LANGUAGES,
  SOURCE_LANGUAGES,
  SOURCE_LANGUAGE_AUTO,
  getLanguageName,
  buildTranslationSystemPrompt,
} from "../src/lib/translate.ts";

let testFailures = 0;

function logPass(msg) {
  console.log(`\x1b[32m✔ PASS:\x1b[0m ${msg}`);
}

function logFail(msg, detail) {
  testFailures++;
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${msg}`);
  if (detail) console.error(`  Detail:`, detail);
}

function assert(condition, msg, detail) {
  if (condition) {
    logPass(msg);
  } else {
    logFail(msg, detail);
  }
}

async function runTests() {
  console.log("\n==================================================");
  console.log("Starting ThreadLine Translation Test Suite");
  console.log("==================================================\n");

  // Group 1: Model ID & Isolation
  console.log("--- Group 1: Translation Model Configuration ---");

  assert(
    TRANSLATION_MODEL_ID === "google/gemma-4-26b-a4b-it",
    "TRANSLATION_MODEL_ID is google/gemma-4-26b-a4b-it"
  );

  assert(
    TRANSLATION_MODEL_INFO.id === TRANSLATION_MODEL_ID && TRANSLATION_MODEL_INFO.name === "Gemma 4 26B",
    "TRANSLATION_MODEL_INFO matches TRANSLATION_MODEL_ID"
  );

  const isUserSelectable = ALLOWED_MODELS.some(
    (m) => m.id === TRANSLATION_MODEL_ID
  );
  assert(
    !isUserSelectable,
    "Translation model is NOT in ALLOWED_MODELS (hidden from standard model selector dropdown)"
  );

  assert(
    ALLOWED_MODEL_IDS.has(TRANSLATION_MODEL_ID),
    "ALLOWED_MODEL_IDS set includes TRANSLATION_MODEL_ID for server authorization"
  );

  assert(
    isAllowedModel(TRANSLATION_MODEL_ID),
    "Server allowlist recognizes google/gemma-4-26b-a4b-it as allowed"
  );

  assert(
    isTranslationModel(TRANSLATION_MODEL_ID),
    "isTranslationModel returns true for TRANSLATION_MODEL_ID"
  );

  assert(
    !isTranslationModel("openai/gpt-6-luna"),
    "isTranslationModel returns false for standard conversational model"
  );

  const modelInfo = getModelInfo(TRANSLATION_MODEL_ID);
  assert(
    modelInfo.name === "Gemma 4 26B" && modelInfo.provider === "Google",
    "getModelInfo returns correct Gemma 4 26B metadata"
  );

  // Group 2: Supported Languages & Auto
  console.log("\n--- Group 2: Supported Languages & Auto Detection ---");

  assert(
    SOURCE_LANGUAGES[0].code === SOURCE_LANGUAGE_AUTO.code && SOURCE_LANGUAGES[0].name === "Auto Detect",
    "SOURCE_LANGUAGES has Auto Detect as first choice matching SOURCE_LANGUAGE_AUTO"
  );

  const hasAutoInTarget = SUPPORTED_LANGUAGES.some((l) => l.code === "auto");
  assert(
    !hasAutoInTarget,
    "Target languages do NOT include 'auto' (only valid target languages allowed)"
  );

  assert(
    SUPPORTED_LANGUAGES.length >= 25,
    `Supported languages has broad coverage (${SUPPORTED_LANGUAGES.length} languages configured)`
  );

  assert(
    getLanguageName("auto") === "Auto Detect",
    "getLanguageName('auto') resolves to 'Auto Detect'"
  );

  assert(
    getLanguageName("es") === "Spanish",
    "getLanguageName('es') resolves to 'Spanish'"
  );

  assert(
    getLanguageName("ro") === "Romanian",
    "getLanguageName('ro') resolves to 'Romanian'"
  );

  // Group 3: Prompt Generation
  console.log("\n--- Group 3: Translation System Prompt Generation ---");

  const autoPrompt = buildTranslationSystemPrompt("auto", "es");
  assert(
    autoPrompt.includes("Spanish") && autoPrompt.includes("Detect the source language automatically"),
    "Auto-detect translation prompt contains automatic detection rule and target language"
  );

  const specificPrompt = buildTranslationSystemPrompt("en", "fr");
  assert(
    specificPrompt.includes("English") && specificPrompt.includes("French"),
    "Specific source-target prompt specifies both source and target languages"
  );

  assert(
    autoPrompt.includes("Output ONLY the translated text"),
    "Prompt strictly forbids conversational chatter or preamble"
  );

  console.log("\n==================================================");
  if (testFailures === 0) {
    console.log("\x1b[32mAll Translation Tests Passed Successfully!\x1b[0m");
  } else {
    console.error(`\x1b[31m${testFailures} Test(s) Failed!\x1b[0m`);
    process.exit(1);
  }
  console.log("==================================================\n");
}

runTests().catch((err) => {
  console.error("Unhandled test runner exception:", err);
  process.exit(1);
});
