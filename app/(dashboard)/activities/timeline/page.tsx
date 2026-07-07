"use client";

// app/(dashboard)/activities/timeline/page.tsx
// Unified Activity Timeline — Task 3

import { UnifiedTimeline } from "@/components/activities/UnifiedTimeline";

export default function TimelinePage() {
  return (
    <div className="max-w-3xl mx-auto py-4">
      <UnifiedTimeline />
    </div>
  );
}
