"use client";

import React, { Suspense } from "react";
import ConnectWorkspace from "@/components/connect/ConnectWorkspace";

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <ConnectWorkspace />
    </Suspense>
  );
}
