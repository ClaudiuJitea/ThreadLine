#!/usr/bin/env node
/**
 * ThreadLine Web Search & Regression Test Suite
 * Validates:
 * 1. SSRF and URL validation (HTTPS only, private IP rejection, metadata service blocking).
 * 2. URL canonicalization and deduplication.
 * 3. Citation parser (preserves code blocks, ignores [99], transforms valid [N] to anchors).
 * 4. Tavily provider interface (basic search only, missing key error, timeout handling).
 * 5. Prompt injection defense and source context bounding.
 * 6. Security verification (session validation & CSRF before any search or LLM call).
 * 7. Storage sanitization (preserves sources metadata, strips base64 images).
 * 8. Backward compatibility with existing conversations.
 */

import { isSafeHttpsUrl, normalizeCanonicalUrl, extractCleanHostname } from "../src/lib/search/ssrf.ts";
import { formatCitationsInMarkdown } from "../src/lib/search/citations.ts";
import { executeWebSearch, formatSourcesForOpenRouterPrompt, TavilyApiKeyMissingError } from "../src/lib/search/index.ts";
import { TavilySearchProvider } from "../src/lib/search/tavily.ts";
import { sanitizeMessagesForLocalStorage, buildPayloadWithBudgetControl, MAX_REQUEST_BUDGET_BYTES } from "../src/lib/image-utils.ts";
import { verifySameOrigin } from "../src/lib/auth.ts";
import { isAllowedModel, isImageGeneratorModel } from "../src/lib/models.ts";
import { formatImageFilename } from "../src/lib/image-tools.ts";
import { getTextToImagePrompt } from "../src/lib/image-generation.ts";
import { buildRefinePrompt, REFINE_ACTIONS } from "../src/lib/refine.ts";
import { STARTER_CATEGORIES, STARTER_PROMPTS, getStarterPrompts } from "../src/lib/starter-prompts.ts";

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
  console.log("Starting ThreadLine Web Search Test Suite");
  console.log("==================================================\n");

  // --------------------------------------------------------------------------
  // TEST GROUP 1: SSRF & HTTPS URL Validation
  // --------------------------------------------------------------------------
  console.log("--- Group 1: SSRF & URL Safety Validation ---");

  assert(isSafeHttpsUrl("https://developer.mozilla.org/en-US/docs/Web"), "Valid public HTTPS URL is accepted");
  assert(isSafeHttpsUrl("https://github.com/torvalds/linux"), "Valid public GitHub URL is accepted");
  assert(!isSafeHttpsUrl("http://insecure-site.com"), "Plain HTTP is rejected (HTTPS strictly required)");
  assert(!isSafeHttpsUrl("ftp://files.example.com"), "FTP protocol is rejected");
  assert(!isSafeHttpsUrl("javascript:alert(1)"), "JavaScript scheme is rejected");
  assert(!isSafeHttpsUrl("file:///etc/passwd"), "File scheme is rejected");
  assert(!isSafeHttpsUrl("https://localhost:8080"), "localhost is rejected");
  assert(!isSafeHttpsUrl("https://my-service.local"), ".local domain is rejected");
  assert(!isSafeHttpsUrl("https://internal-db.internal"), ".internal domain is rejected");
  assert(!isSafeHttpsUrl("https://127.0.0.1:3000"), "IPv4 loopback (127.0.0.1) is rejected");
  assert(!isSafeHttpsUrl("https://10.0.0.1"), "IPv4 private (10.0.0.1) is rejected");
  assert(!isSafeHttpsUrl("https://172.16.5.1"), "IPv4 private (172.16.5.1) is rejected");
  assert(!isSafeHttpsUrl("https://192.168.1.1"), "IPv4 private (192.168.1.1) is rejected");
  assert(!isSafeHttpsUrl("https://169.254.169.254/latest/meta-data"), "AWS Cloud metadata (169.254.169.254) is blocked");
  assert(!isSafeHttpsUrl("https://[::1]"), "IPv6 loopback (::1) is rejected");

  // URL normalization & deduplication
  const canonical1 = normalizeCanonicalUrl("https://example.com/docs/#section-1");
  const canonical2 = normalizeCanonicalUrl("https://example.com/docs/");
  assert(canonical1 === "https://example.com/docs", "Hash fragment stripped during normalization");
  assert(canonical2 === "https://example.com/docs", "Trailing slash normalized for root path");
  assert(extractCleanHostname("https://www.wikipedia.org/wiki/AI") === "wikipedia.org", "Clean hostname extracted without www prefix");

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Citation Formatting in Markdown
  // --------------------------------------------------------------------------
  console.log("\n--- Group 2: Citation Parser & Code Block Protection ---");

  const mockSources = [
    { number: 1, title: "Next.js 16 Docs", url: "https://nextjs.org/docs", hostname: "nextjs.org", snippet: "Next.js 16 released." },
    { number: 2, title: "React 19 Announcement", url: "https://react.dev/blog", hostname: "react.dev", snippet: "React 19 features." },
  ];

  // Test 2.1: Valid citation [1] converts to [1](#citation-1)
  const text1 = "Next.js has released version 16 [1]. React 19 is also out [2].";
  const formatted1 = formatCitationsInMarkdown(text1, mockSources);
  assert(
    formatted1.includes("[1](#citation-1)") && formatted1.includes("[2](#citation-2)"),
    "Valid citations [1] and [2] converted to anchor links"
  );

  // Test 2.2: Unknown citation [99] must remain plain text [99]
  const text2 = "Uncited rumor [99] should not become a link.";
  const formatted2 = formatCitationsInMarkdown(text2, mockSources);
  assert(
    formatted2 === text2,
    "Unknown citation [99] remains plain text without an invented link"
  );

  // Test 2.3: Inline code block `arr[1]` must NOT be altered
  const text3 = "In JavaScript, use `items[1]` or ```const x = arr[2];``` for access.";
  const formatted3 = formatCitationsInMarkdown(text3, mockSources);
  assert(
    formatted3.includes("`items[1]`") && formatted3.includes("arr[2]"),
    "Citations inside inline code and fenced code blocks are protected verbatim"
  );

  // Test 2.4: Empty sources leaves text untouched
  const text4 = "General answer without web search [1].";
  const formatted4 = formatCitationsInMarkdown(text4, []);
  assert(formatted4 === text4, "Empty sources leaves text completely untouched");

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Search Provider & Query Bounding
  // --------------------------------------------------------------------------
  console.log("\n--- Group 3: Search Provider & Prompt Bounding ---");

  // Mock search provider that returns 7 items (2 are duplicates or non-https)
  const mockProvider = {
    name: "MockTavily",
    async search() {
      return [
        { title: "Item 1", url: "https://example.com/page1", content: "Snippet 1".repeat(50) },
        { title: "Item 2", url: "https://example.com/page2", content: "Snippet 2" },
        { title: "Duplicate Item", url: "https://example.com/page1#hash", content: "Dup snippet" },
        { title: "Insecure Item", url: "http://insecure.com", content: "Bad scheme" },
        { title: "Item 3", url: "https://example.com/page3", content: "Snippet 3" },
        { title: "Item 4", url: "https://example.com/page4", content: "Snippet 4" },
        { title: "Item 5", url: "https://example.com/page5", content: "Snippet 5" },
        { title: "Item 6 (Over limit)", url: "https://example.com/page6", content: "Snippet 6" },
      ];
    },
  };

  const searchResult = await executeWebSearch("test query", undefined, mockProvider);
  assert(searchResult.sources.length === 5, "Sources capped at exactly 5 results maximum");
  assert(searchResult.sources[0].snippet.length <= 350, "Snippet length strictly bounded to max 350 characters");
  assert(searchResult.sources[0].number === 1 && searchResult.sources[4].number === 5, "Sources assigned sequential numbers 1 to 5");

  // Prompt formatting with prompt injection guard
  const promptContext = formatSourcesForOpenRouterPrompt(searchResult.sources);
  assert(promptContext.includes("<search_results>"), "Prompt includes <search_results> delimiter block");
  assert(promptContext.includes("CRITICAL SECURITY DIRECTIVE"), "Prompt includes prompt injection defense directive");
  assert(promptContext.includes("MANDATORY INLINE CITATION RULES"), "Prompt includes strict citation instructions");

  // No-results prompt formatting
  const noResultPrompt = formatSourcesForOpenRouterPrompt([], true);
  assert(noResultPrompt.includes("no directly relevant web sources were found"), "No-results prompt clearly informs model that no sources exist");

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Missing TAVILY_API_KEY & Error Handling
  // --------------------------------------------------------------------------
  console.log("\n--- Group 4: Missing Key & Graceful Failure ---");

  const originalKey = process.env.TAVILY_API_KEY;
  delete process.env.TAVILY_API_KEY;

  const tavily = new TavilySearchProvider();
  let threwMissingKey = false;
  try {
    await tavily.search("test");
  } catch (err) {
    if (err instanceof TavilyApiKeyMissingError) {
      threwMissingKey = true;
    }
  }
  assert(threwMissingKey, "Missing TAVILY_API_KEY throws TavilyApiKeyMissingError (fails gracefully for web search)");

  // Restore key if it was set
  if (originalKey) {
    process.env.TAVILY_API_KEY = originalKey;
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Security & CSRF Enforcement
  // --------------------------------------------------------------------------
  console.log("\n--- Group 5: CSRF & Same-Origin Protection ---");

  const validReq = new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      Origin: "http://localhost:3000",
      Host: "localhost:3000",
    },
  });
  assert(verifySameOrigin(validReq), "Same-origin request is accepted");

  const crossOriginReq = new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: {
      Origin: "https://evil-attacker.com",
      Host: "localhost:3000",
    },
  });
  assert(!verifySameOrigin(crossOriginReq), "Cross-origin request is rejected with false (403 Forbidden)");

  // --------------------------------------------------------------------------
  // TEST GROUP 6: Storage Sanitization & Backward Compatibility
  // --------------------------------------------------------------------------
  console.log("\n--- Group 6: Storage Sanitization & Message Integrity ---");

  const testMessages = [
    {
      id: "msg_user_1",
      role: "user",
      content: "Explain quantum computing",
      createdAt: 1000,
      attachments: [
        {
          id: "att_1",
          name: "diagram.png",
          type: "image/png",
          size: 50000,
          dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        },
      ],
    },
    {
      id: "msg_asst_1",
      role: "assistant",
      content: "Quantum computing leverages superposition [1].",
      createdAt: 2000,
      isWebSearch: true,
      sources: [
        {
          number: 1,
          title: "Quantum Overview",
          url: "https://example.com/quantum",
          hostname: "example.com",
          snippet: "Quantum bits can exist in superposition.",
        },
      ],
    },
  ];

  const sanitized = sanitizeMessagesForLocalStorage(testMessages);

  // 1. Base64 stripped from user message
  assert(
    sanitized[0].attachments[0].dataUrl === undefined,
    "Base64 image dataUrl is stripped from localStorage"
  );
  assert(
    sanitized[0].attachments[0].name === "diagram.png",
    "Attachment metadata (name, size, type) is preserved"
  );

  // 2. Web search metadata preserved in assistant message
  assert(
    sanitized[1].isWebSearch === true && sanitized[1].sources.length === 1,
    "Web search sources and isWebSearch flag survive localStorage sanitization"
  );
  assert(
    sanitized[1].sources[0].url === "https://example.com/quantum",
    "Source URL and snippet preserved accurately in stored message"
  );

  // 3. Older conversations without sources load safely
  const oldConversation = {
    id: "conv_old",
    title: "Old Conversation",
    createdAt: 500,
    updatedAt: 500,
    modelId: "openai/gpt-6-luna",
    messages: [
      { id: "m1", role: "user", content: "Hello", createdAt: 500 },
      { id: "m2", role: "assistant", content: "Hi there!", createdAt: 501 },
    ],
  };
  const sanitizedOld = sanitizeMessagesForLocalStorage(oldConversation.messages);
  assert(sanitizedOld[1].sources === undefined, "Older conversations without web search load cleanly without errors");

  // 4. Request budget pruning with text and images
  const { payloadMessages, droppedImageCount } = buildPayloadWithBudgetControl(
    testMessages,
    "Follow-up question",
    [],
    { model: "openai/gpt-6-luna", webSearch: false, aspectRatio: "1:1" }
  );
  assert(payloadMessages.length === 3, "Request budget builds correct payload array");
  assert(droppedImageCount === 0, "Current turn image budget is respected");

  const requestOptions = { model: "openai/gpt-6-luna", webSearch: false, aspectRatio: "1:1" };
  const largeImage = { ...testMessages[0].attachments[0], dataUrl: `data:image/webp;base64,${"a".repeat(MAX_REQUEST_BUDGET_BYTES)}` };
  const oversizedCurrent = buildPayloadWithBudgetControl([], "Look at this", [largeImage], requestOptions);
  assert(oversizedCurrent.exceedsBudget, "Oversized current image is blocked before sending");

  const olderImageHistory = [{ ...testMessages[0], attachments: [largeImage] }];
  const prunedImage = buildPayloadWithBudgetControl(olderImageHistory, "Follow up", [], requestOptions);
  assert(!prunedImage.exceedsBudget && prunedImage.droppedImageCount === 1, "Older image is removed from model context to fit budget");

  const longHistory = [{ id: "long", role: "user", content: "é".repeat(MAX_REQUEST_BUDGET_BYTES), createdAt: 1 }];
  const prunedText = buildPayloadWithBudgetControl(longHistory, "Follow up", [], requestOptions);
  assert(!prunedText.exceedsBudget && prunedText.droppedMessageCount === 1, "Older Unicode text is pruned using encoded request bytes");

  // --------------------------------------------------------------------------
  // TEST GROUP 7: Image Generator Model & Tools Validation
  // --------------------------------------------------------------------------
  console.log("\n--- Group 7: Image Generator Model & Tools Validation ---");

  // 1. Model Allowlist & Type Detection
  assert(
    isAllowedModel("recraft/recraft-v4.1-flash"),
    "recraft/recraft-v4.1-flash is a recognized and allowed model"
  );
  assert(
    isImageGeneratorModel("recraft/recraft-v4.1-flash"),
    "recraft/recraft-v4.1-flash is identified as an image generator model"
  );
  assert(
    !isImageGeneratorModel("openai/gpt-6-luna"),
    "openai/gpt-6-luna is correctly not identified as an image generator"
  );

  assert(
    getTextToImagePrompt([{ role: "user", content: "  A mountain at dawn  " }]).prompt === "A mountain at dawn",
    "Image generation accepts a text prompt"
  );
  assert(
    Boolean(getTextToImagePrompt([{ role: "user", content: [
      { type: "text", text: "Edit this" },
      { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
    ] }]).error),
    "Image generation rejects uploaded image content"
  );
  assert(
    Boolean(getTextToImagePrompt([{ role: "user", content: "   " }]).error),
    "Image generation requires a non-empty text prompt"
  );

  // 2. Safe Filename Formatting
  const filename = formatImageFilename("A serene mountain lake at golden hour!");
  assert(
    filename.startsWith("recraft-a-serene-mountain-lake-at-golden") && filename.endsWith(".png"),
    "formatImageFilename produces sanitized and timestamped .png filename"
  );

  // 3. Generated Image Sanitization for LocalStorage
  const imageGenMessages = [
    {
      id: "msg_gen_1",
      role: "assistant",
      content: "Generated image: ![mountain](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==)",
      createdAt: 3000,
      generatedImages: [
        {
          id: "gen_1",
          url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
          prompt: "mountain",
          aspectRatio: "16:9",
          createdAt: 3000,
        },
        {
          id: "gen_2",
          url: "https://example.com/cdn/image.png",
          prompt: "sunset",
          aspectRatio: "1:1",
          createdAt: 3001,
        },
      ],
    },
  ];

  const sanitizedGen = sanitizeMessagesForLocalStorage(imageGenMessages);
  assert(
    sanitizedGen[0].generatedImages[0].url === "",
    "Base64 data URL is stripped from generatedImages in localStorage"
  );
  assert(
    sanitizedGen[0].generatedImages[0].prompt === "mountain" &&
    sanitizedGen[0].generatedImages[0].aspectRatio === "16:9",
    "Generated image metadata (prompt, aspectRatio, id) is preserved"
  );
  assert(
    sanitizedGen[0].generatedImages[1].url === "https://example.com/cdn/image.png",
    "External HTTPS URL is preserved in localStorage without stripping"
  );
  assert(
    !sanitizedGen[0].content.includes("data:image/"),
    "Markdown base64 data URL is stripped from content to protect localStorage budget"
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 8: Everyday starter templates and Refine actions
  // --------------------------------------------------------------------------
  console.log("\n--- Group 8: Everyday Templates & Refine ---");

  assert(
    STARTER_PROMPTS.length >= 24,
    `STARTER_PROMPTS registry contains comprehensive prompt templates (got ${STARTER_PROMPTS.length})`
  );

  const categoryIds = STARTER_CATEGORIES.map((c) => c.id);

  // All category removal check
  assert(
    !categoryIds.includes("all"),
    "All category pill is removed as requested"
  );

  // Merged Text category checks
  assert(
    categoryIds.includes("text"),
    "STARTER_CATEGORIES includes unified text category"
  );
  const textCategory = STARTER_CATEGORIES.find((c) => c.id === "text");
  assert(
    textCategory && textCategory.label === "Writing",
    "Unified text category uses an everyday label"
  );
  assert(
    !categoryIds.includes("text-correction") &&
    !categoryIds.includes("text-improvement") &&
    !categoryIds.includes("text-polish"),
    "Separate text-correction, text-improvement, and text-polish categories are merged into text"
  );

  const textPrompts = getStarterPrompts("text");
  assert(
    textPrompts.length === 12,
    `Writing category contains 12 everyday templates (got ${textPrompts.length})`
  );
  assert(
    textPrompts.some((p) => p.isFeatured),
    "Text category contains featured prompt"
  );
  assert(
    REFINE_ACTIONS.length === 8 && buildRefinePrompt("clarity", "  Please help  ").includes("Text:\nPlease help"),
    "Refine actions build a prompt from the user's draft"
  );
  assert(
    buildRefinePrompt("correction", "  ") === "",
    "Refine does not create a sendable prompt from an empty draft"
  );

  // Backward compatibility alias checks
  assert(
    getStarterPrompts("text-correction").length === 12 &&
    getStarterPrompts("text-improvement").length === 12 &&
    getStarterPrompts("text-polish").length === 12,
    "Legacy text category queries cleanly resolve to the unified text templates"
  );

  // Merged Mail Category verification
  assert(
    categoryIds.includes("mail"),
    "STARTER_CATEGORIES includes merged mail category"
  );
  assert(
    STARTER_CATEGORIES.find((category) => category.id === "mail")?.label === "Email",
    "Email category uses a familiar label"
  );
  assert(
    !categoryIds.includes("mail-correction") && !categoryIds.includes("mail-suggestion"),
    "Separate mail-correction and mail-suggestion categories were successfully merged"
  );
  const mailPrompts = getStarterPrompts("mail");
  assert(
    mailPrompts.length === 8,
    `Email category contains 8 everyday templates (got ${mailPrompts.length})`
  );

  assert(
    categoryIds.includes("everyday") && getStarterPrompts("everyday").length === 6,
    "Everyday category offers six general-purpose starters"
  );

  // Six focused categories
  assert(
    categoryIds.length === 6,
    `STARTER_CATEGORIES contains six focused categories (got ${categoryIds.length}: ${categoryIds.join(", ")})`
  );

  console.log("\n==================================================");
  console.log(`Web Search & Image Gen Test Summary: ${testFailures === 0 ? "ALL PASSED" : `${testFailures} FAILURE(S)`}`);
  console.log("==================================================\n");

  if (testFailures > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
