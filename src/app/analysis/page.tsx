"use client";

import { Suspense } from "react";
import AnalysisPage from "@/components/AnalysisPage";

export default function AnalysisRoute() {
  return (
    <Suspense fallback={null}>
      <AnalysisPage />
    </Suspense>
  );
}
