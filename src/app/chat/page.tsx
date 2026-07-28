"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ChatAdvisor from "@/components/ChatAdvisor";

function ChatInner() {
  const params = useSearchParams();
  const q = params.get("q") ?? undefined;
  // `key` forces a fresh engine instance if the seed changes (e.g. navigating
  // from home with a different question).
  return <ChatAdvisor key={q ?? "__none__"} seed={q} />;
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatInner />
    </Suspense>
  );
}
