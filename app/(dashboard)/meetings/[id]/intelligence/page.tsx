"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import MeetingIntelligenceInterface from "@/components/sales/MeetingIntelligenceInterface";

export default function MeetingIntelligencePage() {
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
              <h1 className="sales-exec-title">Meeting Intelligence & Transcript</h1>
              <p className="sales-exec-subtitle">
                Conversation transcript analysis, structured action items, commitments, objections, and requirements.
              </p>
            </div>
          </div>
        </div>
      </div>

      <MeetingIntelligenceInterface initialMeetingId={meetingId} />
    </div>
  );
}
