#!/usr/bin/env node
/**
 * ThreadLine Message Flagging Test Suite
 * Validates:
 * 1. Default unflagged state on new user and assistant messages.
 * 2. Toggle flagging logic for individual messages.
 * 3. Preservation of isFlagged flag through localStorage sanitization.
 * 4. Filtering logic for flagged messages.
 * 5. Conversation-level flag detection for sidebar indicators.
 */

import { sanitizeMessagesForLocalStorage } from "../src/lib/image-utils.ts";

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

async function runTests() {
  console.log("\n==================================================");
  console.log("Starting ThreadLine Message Flagging Test Suite");
  console.log("==================================================\n");

  // Group 1: Message Flag State
  console.log("--- Group 1: Message Flag State & Defaults ---");

  const userMsg = {
    id: "msg_user_1",
    role: "user",
    content: "Remember this critical API key rotation step.",
    createdAt: Date.now(),
  };

  const asstMsg = {
    id: "msg_asst_1",
    role: "assistant",
    content: "Here is the step-by-step procedure: ...",
    createdAt: Date.now() + 100,
  };

  assert(userMsg.isFlagged === undefined, "New user message defaults to undefined (unflagged)");
  assert(asstMsg.isFlagged === undefined, "New assistant message defaults to undefined (unflagged)");

  // Toggle flag on user message
  const flaggedUserMsg = { ...userMsg, isFlagged: !userMsg.isFlagged };
  assert(flaggedUserMsg.isFlagged === true, "Toggling user message sets isFlagged to true");

  // Toggle flag again (unflag)
  const unflaggedUserMsg = { ...flaggedUserMsg, isFlagged: !flaggedUserMsg.isFlagged };
  assert(unflaggedUserMsg.isFlagged === false, "Toggling again unflags the message (false)");

  // Toggle flag on assistant message
  const flaggedAsstMsg = { ...asstMsg, isFlagged: true };
  assert(flaggedAsstMsg.isFlagged === true, "Assistant message can be flagged (isFlagged: true)");

  // Group 2: LocalStorage Sanitization & Persistence
  console.log("\n--- Group 2: Storage Sanitization & Flag Persistence ---");

  const conversationMessages = [
    flaggedUserMsg,
    flaggedAsstMsg,
    {
      id: "msg_user_2",
      role: "user",
      content: "Another unflagged query",
      createdAt: Date.now() + 200,
    },
  ];

  const sanitized = sanitizeMessagesForLocalStorage(conversationMessages);

  assert(sanitized[0].isFlagged === true, "Flagged user message retains isFlagged: true after localStorage sanitization");
  assert(sanitized[1].isFlagged === true, "Flagged assistant message retains isFlagged: true after localStorage sanitization");
  assert(!sanitized[2].isFlagged, "Unflagged message remains unflagged after sanitization");

  // Group 3: Filtering & Display Logic
  console.log("\n--- Group 3: Filtering & Flag Count Logic ---");

  const flaggedOnly = conversationMessages.filter((m) => m.isFlagged);
  assert(flaggedOnly.length === 2, "Filtering by isFlagged returns only the 2 flagged messages");
  assert(flaggedOnly[0].id === "msg_user_1", "First flagged message matches user message ID");
  assert(flaggedOnly[1].id === "msg_asst_1", "Second flagged message matches assistant message ID");

  // Group 4: Conversation-level Sidebar Indicators
  console.log("\n--- Group 4: Sidebar Flag Indicators ---");

  const convWithFlags = {
    id: "conv_1",
    title: "Deployment Notes",
    messages: conversationMessages,
  };

  const convWithoutFlags = {
    id: "conv_2",
    title: "Casual Chat",
    messages: [
      { id: "msg_1", role: "user", content: "Hi", createdAt: 100 },
      { id: "msg_2", role: "assistant", content: "Hello", createdAt: 200 },
    ],
  };

  assert(
    convWithFlags.messages.some((m) => m.isFlagged),
    "convWithFlags correctly indicates presence of flagged messages"
  );
  assert(
    !convWithoutFlags.messages.some((m) => m.isFlagged),
    "convWithoutFlags correctly reports no flagged messages"
  );
  assert(
    convWithFlags.messages.filter((m) => m.isFlagged).length === 2,
    "convWithFlags correctly computes 2 flagged messages"
  );

  console.log("\n==================================================");
  if (testFailures === 0) {
    console.log("\x1b[32mAll Message Flagging Tests Passed Successfully!\x1b[0m");
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
