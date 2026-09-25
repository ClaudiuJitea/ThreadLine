import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import fs from "node:fs";
import path from "node:path";

export const SESSION_COOKIE_NAME = "threadline_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Recovers raw APP_PASSWORD_HASH directly from local env files if dotenv-expand corrupted
 * the bcrypt hash by stripping dollar-sign variable expressions (e.g. "$2b$12$...").
 */
function getRawHashFromFile(): string | null {
  try {
    const cwd = process.cwd();
    const candidates = [".env.local", ".env"];
    for (const file of candidates) {
      const fullPath = path.resolve(/*turbopackIgnore: true*/ cwd, file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("#")) continue;
          const match = trimmed.match(/^APP_PASSWORD_HASH\s*=\s*(.*)$/);
          if (match) {
            let val = match[1].trim();
            if (
              (val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))
            ) {
              val = val.slice(1, -1);
            }
            if (val.includes("\\$")) {
              val = val.replace(/\\\$/g, "$");
            }
            if (
              val.startsWith("$2a$") ||
              val.startsWith("$2b$") ||
              val.startsWith("$2y$")
            ) {
              return val;
            }
          }
        }
      }
    }
  } catch {
    // If running in edge or restricted environment, return null
  }
  return null;
}

/**
 * Validates that all required authentication environment variables are set.
 * Fails closed if any variable is missing.
 */
export function getAuthEnv(): {
  passwordHash: string;
  sessionSecret: Uint8Array;
} {
  const hash = process.env.APP_PASSWORD_HASH;
  const secret = process.env.SESSION_SECRET;

  if (!hash || hash.trim().length === 0) {
    console.error(
      "[Security Alert] APP_PASSWORD_HASH environment variable is missing or empty. Refusing authentication."
    );
    throw new Error("SERVER_AUTH_MISCONFIGURED: APP_PASSWORD_HASH missing");
  }

  if (!secret || secret.trim().length < 32) {
    console.error(
      "[Security Alert] SESSION_SECRET environment variable is missing or shorter than 32 characters. Refusing authentication."
    );
    throw new Error("SERVER_AUTH_MISCONFIGURED: SESSION_SECRET missing or too short");
  }

  let rawHash = hash.trim();
  // Strip surrounding quotes if present
  if (
    (rawHash.startsWith('"') && rawHash.endsWith('"')) ||
    (rawHash.startsWith("'") && rawHash.endsWith("'"))
  ) {
    rawHash = rawHash.slice(1, -1);
  }

  // Unescape backslashes if present (e.g. \\$2b\\$...)
  if (rawHash.includes("\\$")) {
    rawHash = rawHash.replace(/\\\$/g, "$");
  }

  // Check if base64 encoded to avoid dotenv-expand dollar-sign corruption
  if (!rawHash.startsWith("$")) {
    try {
      const decoded = Buffer.from(rawHash, "base64").toString("utf-8");
      if (
        decoded.startsWith("$2a$") ||
        decoded.startsWith("$2b$") ||
        decoded.startsWith("$2y$")
      ) {
        rawHash = decoded;
      }
    } catch {
      // Keep as-is
    }
  }

  // If dotenv-expand corrupted the bcrypt hash by stripping $2b$12$, recover from file
  if (
    !rawHash.startsWith("$2a$") &&
    !rawHash.startsWith("$2b$") &&
    !rawHash.startsWith("$2y$")
  ) {
    const recovered = getRawHashFromFile();
    if (recovered) {
      rawHash = recovered;
    }
  }

  return {
    passwordHash: rawHash,
    sessionSecret: new TextEncoder().encode(secret.trim()),
  };
}

/**
 * Validates that OPENROUTER_API_KEY is configured.
 * Fails closed if missing.
 */
export function getOpenRouterKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || key.trim().length === 0) {
    console.error(
      "[Security Alert] OPENROUTER_API_KEY environment variable is missing. Chat cannot be dispatched."
    );
    throw new Error("SERVER_OPENROUTER_MISCONFIGURED: OPENROUTER_API_KEY missing");
  }
  return key.trim();
}

/**
 * Verifies submitted plaintext password against the stored bcrypt hash.
 */
export async function verifyMasterPassword(password: string): Promise<boolean> {
  if (!password || typeof password !== "string") {
    return false;
  }

  try {
    const { passwordHash } = getAuthEnv();
    const isValid = await bcrypt.compare(password, passwordHash);
    if (!isValid) {
      console.warn(
        "[Auth Notice] Submitted password did not match APP_PASSWORD_HASH. (Default test password is 'TestPassword123!' unless you generated a custom hash with npm run hash-password)"
      );
    }
    return isValid;
  } catch (error) {
    console.error("[Auth Error] Password verification failed:", error);
    return false;
  }
}

/**
 * Creates a signed, tamper-proof session JWT.
 * Rotating SESSION_SECRET immediately invalidates all issued tokens.
 */
export async function createSessionToken(): Promise<string> {
  const { sessionSecret } = getAuthEnv();
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({
    sub: "single_user_owner",
    role: "owner",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_MAX_AGE_SECONDS)
    .sign(sessionSecret);
}

/**
 * Verifies a session token string.
 * Returns true if valid and unexpired; false otherwise.
 */
export async function verifySessionToken(token: string | null | undefined): Promise<boolean> {
  if (!token || typeof token !== "string") {
    return false;
  }

  try {
    const { sessionSecret } = getAuthEnv();
    const { payload } = await jwtVerify(token, sessionSecret, {
      algorithms: ["HS256"],
    });

    if (payload.sub !== "single_user_owner") {
      return false;
    }

    return true;
  } catch {
    // Signature failed, token expired, or token malformed
    return false;
  }
}

/**
 * Extracts and verifies the session token from a standard Cookie header string.
 */
export async function verifySessionFromCookieHeader(
  cookieHeader: string | null
): Promise<boolean> {
  if (!cookieHeader) return false;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!sessionCookie) return false;

  const token = sessionCookie.substring(SESSION_COOKIE_NAME.length + 1);
  return verifySessionToken(token);
}

/**
 * Verifies session directly from a NextRequest or Request object.
 */
export async function verifySessionFromRequest(request: Request): Promise<boolean> {
  const cookieHeader = request.headers.get("cookie");
  return verifySessionFromCookieHeader(cookieHeader);
}

/**
 * Strict same-origin verification for state-changing HTTP methods (POST, PUT, DELETE).
 * Protects against cross-site request forgery without permissive CORS.
 */
export function verifySameOrigin(request: Request): boolean {
  // Sec-Fetch-Site header: modern browsers send this for cross-origin requests
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "cross-site") {
    return false;
  }

  const originHeader = request.headers.get("origin");
  const hostHeader =
    request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (!hostHeader) {
    // Cannot determine host to verify
    return false;
  }

  if (originHeader) {
    try {
      const originUrl = new URL(originHeader);
      // Strip port if needed, or compare directly host
      return originUrl.host.toLowerCase() === hostHeader.toLowerCase();
    } catch {
      return false;
    }
  }

  // Fallback to Referer header if Origin is absent
  const refererHeader = request.headers.get("referer");
  if (refererHeader) {
    try {
      const refererUrl = new URL(refererHeader);
      return refererUrl.host.toLowerCase() === hostHeader.toLowerCase();
    } catch {
      return false;
    }
  }

  // If both origin and referer are missing on state-changing request,
  // allow only in non-production local development or reject.
  // In production, reject requests lacking origin/referer headers.
  return process.env.NODE_ENV !== "production";
}

/**
 * Standard cookie configuration for the session token.
 */
export function getSessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
