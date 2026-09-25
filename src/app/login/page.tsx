import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { LoginForm } from "./LoginForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - ThreadLine Private AI",
  description: "Private single-user login for ThreadLine AI workspace",
};

export default async function LoginPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    const isValid = await verifySessionToken(sessionToken);
    if (isValid) {
      redirect("/");
    }
  }

  return <LoginForm />;
}
