import { NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const isAuthenticated = await verifySessionFromRequest(request);

  if (!isAuthenticated) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true }, { status: 200 });
}
