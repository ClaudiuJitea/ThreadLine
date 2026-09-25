import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { ClientOnlyChat } from "@/components/ClientOnlyChat";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "ThreadLine - Private AI Workspace",
  description: "Secure, single-user private chat interface powered by OpenRouter",
};

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  const isValid = await verifySessionToken(sessionToken);
  if (!isValid) {
    redirect("/login");
  }

  return <ClientOnlyChat />;
}
