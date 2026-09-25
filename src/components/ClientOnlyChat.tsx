"use client";

import dynamic from "next/dynamic";
import { Shield } from "lucide-react";

const ChatContainer = dynamic(
  () => import("./ChatContainer").then((mod) => mod.ChatContainer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen bg-[#F8F5EF] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FFFCF7] border border-[#D8CFC2] flex items-center justify-center shadow-xs">
            <Shield className="w-5 h-5 text-[#536E59]" />
          </div>
          <span className="text-xs text-[#625D55] font-medium tracking-wide">
            Loading ThreadLine...
          </span>
        </div>
      </div>
    ),
  }
);

export function ClientOnlyChat() {
  return <ChatContainer />;
}
