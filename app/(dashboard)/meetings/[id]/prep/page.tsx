"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import MeetingPrepInterface from "@/components/sales/MeetingPrepInterface";

export default function MeetingPrepPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = (params?.id as string) || "";

  return (
    <div className="sales-exec-page">
      <div className="sales-exec-header">
        <div className="sales-exec-title-row">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              type="button"
              className="sales-btn-icon"
              onClick={() => router.back()}
              title="Go back"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="sales-exec-title-wrap">
              <h1 className="sales-exec-title">AI Meeting Preparation</h1>
              <p className="sales-exec-subtitle">
                Pre-meeting grounding brief, open deals, risks, and suggested agenda.
              </p>
            </div>
          </div>
        </div>
      </div>

      <MeetingPrepInterface initialMeetingId={meetingId} />
    </div>
  );
}
