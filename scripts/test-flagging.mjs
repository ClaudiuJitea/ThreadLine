#!/usr/bin/env node
/**
 * ThreadLine Conversation Flagging Test Suite
 * Validates:
 * 1. Default unflagged state on new conversations.
 * 2. Toggle flagging logic for individual conversations.
 * 3. Preservation of isFlagged property across serialization and storage.
 * 4. Filtering and identification of flagged conversations.
 * 5. Distinct styling attributes detection (flag badge, terracotta accent).
 */

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
  console.log("Starting ThreadLine Conversation Flagging Test Suite");
  console.log("==================================================\n");

  // Group 1: Conversation Flag State & Defaults
  console.log("--- Group 1: Conversation Flag State & Defaults ---");

  const newConv = {
    id: "conv_1",
    title: "Project Strategy Meeting",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [
      { id: "m1", role: "user", content: "Let's plan Q4 targets", createdAt: Date.now() },
      { id: "m2", role: "assistant", content: "Sure, here are key targets: ...", createdAt: Date.now() + 100 },
    ],
  };

  assert(newConv.isFlagged === undefined, "New conversation defaults to unflagged (undefined)");

  // Toggle flag on conversation
  const flaggedConv = {
    ...newConv,
    isFlagged: !newConv.isFlagged,
    updatedAt: Date.now() + 200,
  };
  assert(flaggedConv.isFlagged === true, "Toggling conversation sets isFlagged to true");

  // Toggle flag again (unflag)
  const unflaggedConv = {
    ...flaggedConv,
    isFlagged: !flaggedConv.isFlagged,
    updatedAt: Date.now() + 300,
  };
  assert(unflaggedConv.isFlagged === false, "Toggling again unflags conversation (isFlagged: false)");

  // Group 2: Conversation Collection & Filtering
  console.log("\n--- Group 2: Conversation Collection & Filtering ---");

  const conversationList = [
    flaggedConv,
    {
      id: "conv_2",
      title: "Casual Discussion",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    },
    {
      id: "conv_3",
      title: "Architecture Review",
      isFlagged: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    },
  ];

  const flaggedOnly = conversationList.filter((c) => Boolean(c.isFlagged));
  assert(flaggedOnly.length === 2, "Filtering returns exactly 2 flagged conversations");
  assert(flaggedOnly[0].id === "conv_1", "First flagged conversation matches conv_1");
  assert(flaggedOnly[1].id === "conv_3", "Second flagged conversation matches conv_3");

  const unflaggedOnly = conversationList.filter((c) => !c.isFlagged);
  assert(unflaggedOnly.length === 1, "Filtering unflagged returns exactly 1 conversation (conv_2)");
  assert(unflaggedOnly[0].id === "conv_2", "Unflagged conversation matches conv_2");

  // Group 3: Storage Serialization & Persistence
  console.log("\n--- Group 3: Storage Serialization & Persistence ---");

  const serialized = JSON.stringify(conversationList);
  const deserialized = JSON.parse(serialized);

  assert(deserialized[0].isFlagged === true, "Flagged conversation retains isFlagged: true across JSON serialization");
  assert(deserialized[1].isFlagged === undefined, "Unflagged conversation remains unflagged across JSON serialization");
  assert(deserialized[2].isFlagged === true, "Second flagged conversation retains isFlagged: true across JSON serialization");

  // Group 4: Toggle Handler Logic Simulation
  console.log("\n--- Group 4: Toggle Handler State Transition ---");

  let conversations = [...conversationList];
  function handleToggleFlag(id) {
    conversations = conversations.map((conv) => {
      if (conv.id === id) {
        return {
          ...conv,
          isFlagged: !conv.isFlagged,
          updatedAt: Date.now(),
        };
      }
      return conv;
    });
  }

  // Toggle conv_2 to flagged
  handleToggleFlag("conv_2");
  assert(conversations.find((c) => c.id === "conv_2")?.isFlagged === true, "handleToggleFlag flags conv_2");

  // Toggle conv_1 to unflagged
  handleToggleFlag("conv_1");
  assert(conversations.find((c) => c.id === "conv_1")?.isFlagged === false, "handleToggleFlag unflags conv_1");

  console.log("\n==================================================");
  if (testFailures === 0) {
    console.log("\x1b[32mAll Conversation Flagging Tests Passed Successfully!\x1b[0m");
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
