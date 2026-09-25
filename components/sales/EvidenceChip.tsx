"use client";

import React from "react";
import { Quote, Sparkles } from "lucide-react";

interface EvidenceChipProps {
  evidence?: string | null;
  confidence?: number | null;
  label?: string;
  sourceDate?: string;
}

export const EvidenceChip: React.FC<EvidenceChipProps> = ({
  evidence,
  confidence,
  label,
  sourceDate,
}) => {
  if (!evidence && !sourceDate && !label) {
    return null;
  }

  const confidencePercent =
    typeof confidence === "number" && !isNaN(confidence)
      ? `${Math.round(confidence <= 1 ? confidence * 100 : confidence)}%`
      : null;

  return (
    <div className="sales-evidence-chip" title={evidence || label || ""}>
      <Sparkles size={12} />
      {label && <span>{label}:</span>}
      {evidence && (
        <span className="sales-evidence-quote">
          &ldquo;{evidence}&rdquo;
        </span>
      )}
      {sourceDate && (
        <span>(source: {new Date(sourceDate).toLocaleDateString()})</span>
      )}
      {confidencePercent && (
        <span className="sales-evidence-confidence">{confidencePercent}</span>
      )}
    </div>
  );
};

export default EvidenceChip;
