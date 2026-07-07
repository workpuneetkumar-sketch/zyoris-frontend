"use client";

// app/(dashboard)/leads/duplicates/page.tsx
// Duplicate Lead Merge page — Task 1

import { DuplicateMergeUI } from "@/components/leads/DuplicateMergeUI";

export default function DuplicatesPage() {
  return (
    <div className="max-w-4xl mx-auto py-4">
      <DuplicateMergeUI />
    </div>
  );
}
