#!/usr/bin/env node
import bcrypt from "bcryptjs";
import readline from "node:readline";

async function main() {
  const argPassword = process.argv[2];

  if (argPassword) {
    await generateHash(argPassword, true);
    return;
  }

  // If no argument, read interactively
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter the password to hash: ", async (answer) => {
    rl.close();
    if (!answer || answer.trim().length === 0) {
      console.error("\x1b[31mError: Password cannot be empty.\x1b[0m");
      process.exit(1);
    }
    await generateHash(answer);
  });
}

async function generateHash(password, fromArg = false) {
  if (password.length < 8) {
    console.warn(
      "\x1b[33mWarning: Using a password shorter than 8 characters is strongly discouraged.\x1b[0m"
    );
  }

  console.log(`\nPassword to hash: "${password}" (length: ${password.length} characters)`);
  if (fromArg) {
    console.log(
      "\x1b[33m⚠️  Note: If your password contains '$', avoid double quotes \"...\" in Bash/Zsh as the shell expands '$$' to your PID. Use single quotes '...' or run 'npm run hash-password' without arguments.\x1b[0m"
    );
  }

  const saltRounds = 12;
  console.log(`Hashing password with bcrypt (${saltRounds} rounds)...`);
  const hash = await bcrypt.hash(password, saltRounds);

  const base64Hash = Buffer.from(hash).toString("base64");

  console.log("\n\x1b[32m✔ Password hash generated successfully!\x1b[0m\n");
  console.log("For Vercel Project Environment Variables (Dashboard):");
  console.log(`\x1b[36mAPP_PASSWORD_HASH=${hash}\x1b[0m\n`);
  console.log("For local .env.local file (safe from shell/dotenv dollar-sign expansion):");
  console.log(`\x1b[36mAPP_PASSWORD_HASH="${base64Hash}"\x1b[0m\n`);
  console.log("Never commit this hash or plaintext password to Git repository.\n");
}

main().catch((err) => {
  console.error("Failed to generate password hash:", err);
  process.exit(1);
});
