"use client";

import React from "react";
import ActivityCaptureWorkspace from "@/components/sales/ActivityCaptureWorkspace";

export default function SalesActivitiesPage() {
  return (
    <div className="sales-exec-page">
      <div className="sales-exec-header">
        <div className="sales-exec-title-row">
          <div className="sales-exec-title-wrap">
            <h1 className="sales-exec-title">Sales Activity Capture Workspace</h1>
            <p className="sales-exec-subtitle">
              Unified real-time activity timeline across Email, Calendar, Calls, Meetings, and WhatsApp.
            </p>
          </div>
        </div>
      </div>

      <ActivityCaptureWorkspace />
    </div>
  );
}
