"use client";

import { Suspense } from "react";
import HumanAdvisor from "@/components/HumanAdvisor";

export default function Human() {
  return (
    <Suspense fallback={null}>
      <HumanAdvisor />
    </Suspense>
  );
}
