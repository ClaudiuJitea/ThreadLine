"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, Eye, EyeOff, ArrowRight, AlertCircle, KeyRound } from "lucide-react";
import { ThreadLineLogo } from "@/components/ThreadLineLogo";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Authentication failed. Please verify password.");
        setIsLoading(false);
        return;
      }

      // Success: browser received HttpOnly session cookie, redirect to chat interface
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Login request failed:", msg);
      setErrorMessage("Network error occurred during authentication.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8F5EF] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header Icon & Title */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4A6450] via-[#3E5644] to-[#324637] border border-[#2D3F32] flex items-center justify-center mx-auto mb-3.5 shadow-xs ring-1 ring-white/15">
            <ThreadLineLogo className="w-6 h-6 text-[#F8F5EF]" />
          </div>
          <h1 className="text-xl font-medium text-[#302D29] tracking-tight">
            ThreadLine
          </h1>
          <p className="text-xs text-[#716B62] mt-1">
            Private, Single-User Workspace
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-[#D8CFC2] bg-[#FFFCF7] p-6 sm:p-7 shadow-xs">
          <div className="flex items-center gap-2 mb-5 pb-3.5 border-b border-[#D8CFC2]">
            <KeyRound className="w-4 h-4 text-[#536E59]" />
            <div>
              <h2 className="text-xs font-semibold text-[#302D29] uppercase tracking-wide">
                Master Authentication
              </h2>
              <p className="text-[11px] text-[#716B62]">
                Enter master password to unlock workspace.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-[#F5ECE8] border border-[#A4715E] flex items-start gap-2.5 text-xs text-[#A4715E]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-[#302D29] mb-1.5"
              >
                Master Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#716B62]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter master password..."
                  required
                  autoFocus
                  disabled={isLoading}
                  className="w-full pl-10 pr-10 py-2 rounded-lg bg-[#F2ECE2] border border-[#D8CFC2] text-sm text-[#302D29] placeholder-[#716B62] focus:outline-none focus:border-[#536E59] focus:ring-2 focus:ring-[#536E59]/20 transition duration-150 disabled:opacity-50 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#716B62] hover:text-[#302D29] transition cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[#536E59] hover:bg-[#405845] text-[#FFFCF7] font-medium text-xs tracking-wide transition duration-150 disabled:bg-[#E2DAD0] disabled:text-[#867E74] disabled:border disabled:border-[#D8CFC2] disabled:cursor-not-allowed cursor-pointer shadow-xs"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[#FFFCF7] border-t-transparent rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Unlock Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Security Features List */}
          <div className="mt-5 pt-4 border-t border-[#D8CFC2] text-[11px] text-[#625D55] space-y-1.5">
            <div className="flex items-center gap-1.5 font-medium text-[#302D29]">
              <Shield className="w-3.5 h-3.5 text-[#536E59]" />
              <span>Private App-Level Security</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[#625D55] leading-normal">
              <li>Verified against server-only hash with bcrypt</li>
              <li>Signed, expiring HttpOnly & SameSite=Lax session cookie</li>
              <li>Protected by same-origin CSRF validation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
