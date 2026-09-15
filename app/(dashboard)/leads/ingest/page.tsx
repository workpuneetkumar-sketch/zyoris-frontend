"use client";

import React from "react";
import { LeadIngestionWorkbench } from "@/components/leads/ingestion/LeadIngestionWorkbench";

export default function LeadIngestPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <LeadIngestionWorkbench />
    </div>
  );
}
