import { NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCookieOptions,
  verifyMasterPassword,
  verifySameOrigin,
} from "@/lib/auth";

export async function POST(request: Request) {
  // Prevent CSRF on state-changing requests
  if (!verifySameOrigin(request)) {
    return NextResponse.json(
      { error: "Forbidden: Cross-site request rejected" },
      { status: 403 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  const { password } = body;
  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "Password is required" },
      { status: 400 }
    );
  }

  try {
    const isValid = await verifyMasterPassword(password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid master password" },
        { status: 401 }
      );
    }

    const token = await createSessionToken();
    const cookieOptions = getSessionCookieOptions();

    const response = NextResponse.json({ success: true }, { status: 200 });

    response.cookies.set({
      name: cookieOptions.name,
      value: token,
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
    });

    return response;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.startsWith("SERVER_AUTH_MISCONFIGURED")) {
      return NextResponse.json(
        {
          error:
            "Authentication system is not configured on this server. Contact administrator.",
        },
        { status: 500 }
      );
    }

    console.error("[Login Route Error]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during login" },
      { status: 500 }
    );
  }
}
