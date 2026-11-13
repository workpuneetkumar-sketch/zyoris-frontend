"use client";

import React, { Suspense } from "react";
import ConnectWorkspace from "@/components/connect/ConnectWorkspace";

export default function ConnectPage() {
  return (
    <Suspense fallback={null}>
      <ConnectWorkspace />
    </Suspense>
  );
}
