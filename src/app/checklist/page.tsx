"use client";

import { Suspense } from "react";
import ChecklistPage from "@/components/ChecklistPage";

export default function ChecklistRoute() {
  return (
    <Suspense fallback={null}>
      <ChecklistPage />
    </Suspense>
  );
}
