"use client";

// components/dashboard-builder/WidgetRenderer.tsx
// Renders the appropriate widget component based on widgetId.

import React from "react";
import { getWidgetEntry } from "./WidgetRegistry";
import { AlertTriangle } from "lucide-react";

interface WidgetRendererProps {
  widgetId: string;
  isPreview?: boolean;
  onForbidden?: () => void;
}

export function WidgetRenderer({ widgetId, isPreview, onForbidden }: WidgetRendererProps) {
  const entry = getWidgetEntry(widgetId);

  if (!entry) {
    return (
      <div className="h-full flex items-center justify-center text-center p-4">
        <div>
          <AlertTriangle size={24} className="text-amber-400 mx-auto mb-2" />
          <p className="text-xs text-gray-500">
            Unknown widget:{" "}
            <span className="font-mono text-gray-700">{widgetId}</span>
          </p>
        </div>
      </div>
    );
  }

  const { component: WidgetComponent } = entry;
  return <WidgetComponent isPreview={isPreview} onForbidden={onForbidden} />;
}
