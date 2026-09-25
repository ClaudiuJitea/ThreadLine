#!/usr/bin/env node
import crypto from "node:crypto";

function main() {
  // Generate 32 bytes (256 bits) of cryptographically secure random data
  const secret = crypto.randomBytes(32).toString("hex");

  console.log("\n\x1b[32m✔ Strong random session secret generated!\x1b[0m\n");
  console.log("Add this to your .env.local file or Vercel Environment Variables:\n");
  console.log(`\x1b[36mSESSION_SECRET="${secret}"\x1b[0m\n`);
  console.log("Keep this secret private. Rotating it will immediately invalidate all active sessions.\n");
}

main();
