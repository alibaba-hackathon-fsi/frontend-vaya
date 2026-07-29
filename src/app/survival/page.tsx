"use client";

import { Suspense } from "react";
import SurvivalScore from "@/components/SurvivalScore";

export default function SurvivalPage() {
  return (
    <Suspense fallback={null}>
      <SurvivalScore />
    </Suspense>
  );
}
