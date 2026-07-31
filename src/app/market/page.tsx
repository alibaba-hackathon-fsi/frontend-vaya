"use client";

import { Suspense } from "react";
import Marketplace from "@/components/Marketplace";

export default function Market() {
  return (
    <Suspense fallback={null}>
      <Marketplace />
    </Suspense>
  );
}
