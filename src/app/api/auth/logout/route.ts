import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
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

  const cookieOptions = getSessionCookieOptions();
  const response = NextResponse.json({ success: true }, { status: 200 });

  // Clear session cookie
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
    maxAge: 0,
  });

  return response;
}
