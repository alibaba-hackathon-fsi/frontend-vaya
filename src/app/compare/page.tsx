"use client";

import { Suspense } from "react";
import ComparePage from "@/components/ComparePage";

export default function Compare() {
  return (
    <Suspense fallback={null}>
      <ComparePage />
    </Suspense>
  );
}
