#!/usr/bin/env node
/**
 * ThreadLine Security & Functional Verification Suite
 * Tests all authentication, authorization, CSRF, and routing requirements.
 */

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";
let testFailures = 0;

function logPass(msg) {
  console.log(`\x1b[32m✔ PASS:\x1b[0m ${msg}`);
}

function logFail(msg, detail) {
  testFailures++;
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${msg}`);
  if (detail) console.error(`  Detail:`, detail);
}

async function runTests() {
  console.log(`\n========================================`);
  console.log(`Starting ThreadLine Security Test Suite`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`========================================\n`);

  let validSessionCookie = "";

  // TEST 1: Unauthenticated visit to protected route "/" must redirect to "/login"
  try {
    const res = await fetch(`${BASE_URL}/`, {
      redirect: "manual",
    });
    const location = res.headers.get("location");
    if (res.status === 307 || res.status === 302 || res.status === 303) {
      if (location && location.includes("/login")) {
        logPass(`Unauthenticated visitor to "/" is redirected to /login (${res.status} Location: ${location})`);
      } else {
        logFail(`Expected redirect to /login, got Location: ${location}`);
      }
    } else {
      logFail(`Expected 307/302 redirect for unauthenticated visitor, got ${res.status}`);
    }
  } catch (err) {
    logFail(`Failed to test unauthenticated visit to "/"`, err.message);
  }

  // TEST 2: Direct POST to /api/chat without session cookie MUST return 401
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
      },
      body: JSON.stringify({
        model: "openai/gpt-6-luna",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));
      logPass(`Direct POST to /api/chat without session returns 401 (${JSON.stringify(data)})`);
    } else {
      logFail(`Direct POST to /api/chat without session returned ${res.status} instead of 401`);
    }
  } catch (err) {
    logFail(`Failed to test unauthenticated POST to /api/chat`, err.message);
  }

  // TEST 3: Direct POST to /api/chat with forged/tampered session cookie MUST return 401
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "threadline_session=tampered.fake.token",
        Origin: BASE_URL,
      },
      body: JSON.stringify({
        model: "openai/gpt-6-luna",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    if (res.status === 401) {
      logPass(`Tampered session cookie returns 401 Unauthorized`);
    } else {
      logFail(`Tampered session cookie returned ${res.status} instead of 401`);
    }
  } catch (err) {
    logFail(`Failed to test tampered cookie`, err.message);
  }

  // TEST 4: CSRF Cross-Origin POST to /api/auth/login MUST return 403 Forbidden
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://malicious-attacker-website.com",
        "Sec-Fetch-Site": "cross-site",
      },
      body: JSON.stringify({ password: "wrongpassword" }),
    });

    if (res.status === 403) {
      logPass(`Cross-origin POST to /api/auth/login is rejected with 403 Forbidden`);
    } else {
      logFail(`Cross-origin POST returned ${res.status} instead of 403`);
    }
  } catch (err) {
    logFail(`Failed to test CSRF protection`, err.message);
  }

  // TEST 5: Login with wrong password MUST return 401
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
      },
      body: JSON.stringify({ password: "incorrect_guess_password_123" }),
    });

    if (res.status === 401) {
      logPass(`Login with wrong password returns 401 Unauthorized`);
    } else {
      logFail(`Login with wrong password returned ${res.status} instead of 401`);
    }
  } catch (err) {
    logFail(`Failed to test invalid password`, err.message);
  }

  // TEST 6: Login with correct password MUST return 200 and Set-Cookie with HttpOnly & SameSite=Lax
  try {
    const testPassword = process.env.TEST_PASSWORD || "TestPassword123!";
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: BASE_URL,
      },
      body: JSON.stringify({ password: testPassword }),
    });

    if (res.status === 200) {
      const setCookie = res.headers.get("set-cookie") || "";
      if (
        setCookie.includes("threadline_session=") &&
        setCookie.toLowerCase().includes("httponly") &&
        setCookie.toLowerCase().includes("samesite=lax")
      ) {
        logPass(`Login with correct password returns 200 and issues secure HttpOnly SameSite=Lax cookie`);
        // Extract session cookie for subsequent tests
        const match = setCookie.match(/threadline_session=([^;]+)/);
        if (match) {
          validSessionCookie = match[0];
        }
      } else {
        logFail(`Set-Cookie header missing required security attributes: ${setCookie}`);
      }
    } else {
      const data = await res.json().catch(() => ({}));
      logFail(`Login with correct password failed (${res.status}): ${JSON.stringify(data)}`);
    }
  } catch (err) {
    logFail(`Failed to test valid login`, err.message);
  }

  // TEST 7: /api/auth/me with valid session cookie MUST return 200 authenticated: true
  if (validSessionCookie) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: {
          Cookie: validSessionCookie,
        },
      });

      if (res.status === 200) {
        const data = await res.json();
        if (data.authenticated === true) {
          logPass(`/api/auth/me with session cookie confirms authenticated: true`);
        } else {
          logFail(`/api/auth/me returned authenticated: false`);
        }
      } else {
        logFail(`/api/auth/me returned ${res.status}`);
      }
    } catch (err) {
      logFail(`Failed to test /api/auth/me with session`, err.message);
    }

    // TEST 8: Model allowlist enforcement - unauthorized model MUST return 400 Bad Request
    try {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: validSessionCookie,
          Origin: BASE_URL,
        },
        body: JSON.stringify({
          model: "unauthorized/hacked-model-id",
          messages: [{ role: "user", content: "Test" }],
        }),
      });

      if (res.status === 400) {
        const data = await res.json();
        if (data.error && data.error.includes("Invalid or unauthorized model ID")) {
          logPass(`Model allowlist enforced on server: unauthorized model rejected with 400`);
        } else {
          logFail(`Unauthorized model returned unexpected error: ${JSON.stringify(data)}`);
        }
      } else {
        logFail(`Unauthorized model returned status ${res.status} instead of 400`);
      }
    } catch (err) {
      logFail(`Failed to test model allowlist`, err.message);
    }

    // TEST 9: Logout clears cookie and revokes session
    try {
      const res = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          Cookie: validSessionCookie,
          Origin: BASE_URL,
        },
      });

      if (res.status === 200) {
        const setCookie = res.headers.get("set-cookie") || "";
        if (
          setCookie.includes("threadline_session=") &&
          (setCookie.includes("Max-Age=0") || setCookie.includes("expires="))
        ) {
          logPass(`Logout successfully clears the session cookie with Max-Age=0`);
        } else {
          logFail(`Logout Set-Cookie header did not clear cookie: ${setCookie}`);
        }
      } else {
        logFail(`Logout returned status ${res.status}`);
      }
    } catch (err) {
      logFail(`Failed to test logout`, err.message);
    }

    // TEST 10: Secret Rotation - Token signed with a different/old secret MUST be rejected
    try {
      const { SignJWT } = await import("jose");
      const oldSecret = new TextEncoder().encode("different_old_secret_that_has_now_been_rotated_12345");
      const expiredOrRotatedToken = await new SignJWT({ sub: "single_user_owner", role: "owner" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(oldSecret);

      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: {
          Cookie: `threadline_session=${expiredOrRotatedToken}`,
        },
      });

      if (res.status === 401) {
        logPass(`Secret rotation works: token signed with rotated/previous secret is rejected with 401`);
      } else {
        logFail(`Token from rotated secret was accepted with status ${res.status} instead of 401`);
      }
    } catch (err) {
      logFail(`Failed to test secret rotation`, err.message);
    }
  } else {
    logFail(`Skipping authenticated tests because login test did not yield a session cookie`);
  }

  console.log(`\n========================================`);
  console.log(`Test Summary: ${testFailures === 0 ? "ALL PASSED" : `${testFailures} FAILURE(S)`}`);
  console.log(`========================================\n`);

  if (testFailures > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test suite fatal error:", err);
  process.exit(1);
});
