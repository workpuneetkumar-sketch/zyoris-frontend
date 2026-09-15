"use client";

import React from "react";
import { useParams } from "next/navigation";
import { WorkspacePageView } from "@/components/workspace/WorkspacePageView";

export default function DynamicWorkspacePage() {
  const params = useParams();
  const id = (params?.id as string) || "";

  if (!id) {
    return (
      <div className="p-8 text-center text-slate-500">
        Invalid page ID requested.
      </div>
    );
  }

  return <WorkspacePageView pageId={id} />;
}
