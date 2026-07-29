"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ChatAdvisor from "@/components/ChatAdvisor";

function ChatInner() {
  const params = useSearchParams();
  const q = params.get("q") ?? undefined;
  // `?pkg=<index>` opens a package-specific consultation instead of the
  // generic needs-based flow (used by the AI-advisor button on a package page).
  const pkgRaw = params.get("pkg");
  const pkg = pkgRaw != null && !Number.isNaN(parseInt(pkgRaw, 10)) ? parseInt(pkgRaw, 10) : undefined;
  // `key` forces a fresh engine instance when the seed/package changes.
  return <ChatAdvisor key={pkg != null ? "p" + pkg : q ?? "__none__"} seed={q} pkg={pkg} />;
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatInner />
    </Suspense>
  );
}
