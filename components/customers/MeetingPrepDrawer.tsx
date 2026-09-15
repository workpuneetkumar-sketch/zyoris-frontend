"use client";

import React, { useState } from "react";
import { X, Loader2, Sparkles, AlertTriangle, Users, CheckSquare, List } from "lucide-react";
import { useMeetingPrep } from "@/hooks/useMeetingPrep";

interface MeetingPrepDrawerProps {
  customerId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function MeetingPrepDrawer({ customerId, isOpen, onClose }: MeetingPrepDrawerProps) {
  const { meetingPrepData, generateMeetingPrep, loading, error } = useMeetingPrep(customerId);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = async () => {
    await generateMeetingPrep();
    setHasGenerated(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-border-light bg-surface shadow-xl">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-light p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-text">AI Meeting Preparation</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-surface-hover text-text-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!hasGenerated && !loading ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <Sparkles className="h-12 w-12 text-primary/50" />
              <p className="text-text-secondary max-w-xs">
                Generate a comprehensive meeting brief using canonical CRM data and AI intelligence.
              </p>
              <button
                onClick={handleGenerate}
                className="mt-4 rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary/90 transition-colors"
              >
                Generate Brief
              </button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-text-secondary">Synthesizing customer context...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-error">
              <AlertTriangle className="h-8 w-8" />
              <p>Failed to generate meeting preparation.</p>
              <button onClick={handleGenerate} className="text-sm underline">Try again</button>
            </div>
          ) : meetingPrepData ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Summary */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-3">Executive Summary</h3>
                <p className="text-sm text-text-secondary leading-relaxed bg-surface-hover p-4 rounded-lg border border-border-light">
                  {meetingPrepData.summary}
                </p>
              </section>

              {/* Agenda */}
              {meetingPrepData.agenda && meetingPrepData.agenda.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-muted mb-3">
                    <List className="h-4 w-4" /> Suggested Agenda
                  </h3>
                  <ul className="space-y-2">
                    {meetingPrepData.agenda.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center text-sm p-3 border border-border-light rounded-lg">
                        <span className="text-text font-medium">{item.topic}</span>
                        <span className="text-text-muted text-xs bg-surface-hover px-2 py-1 rounded">{item.durationInMinutes} min</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Risks */}
              {meetingPrepData.risks && meetingPrepData.risks.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-muted mb-3">
                    <AlertTriangle className="h-4 w-4" /> Account Risks
                  </h3>
                  <ul className="space-y-3">
                    {meetingPrepData.risks.map((risk, idx) => (
                      <li key={idx} className="text-sm p-3 border-l-2 border-error bg-error/5 rounded-r-lg">
                        <div className="flex justify-between mb-1">
                          <span className="font-semibold text-text">{risk.severity} Risk</span>
                          {risk.evidenceIds && risk.evidenceIds.length > 0 && (
                            <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-border-light text-text-muted">Traceable</span>
                          )}
                        </div>
                        <span className="text-text-secondary">{risk.description}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Stakeholders */}
              {meetingPrepData.stakeholders && meetingPrepData.stakeholders.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-muted mb-3">
                    <Users className="h-4 w-4" /> Key Stakeholders
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {meetingPrepData.stakeholders.map((person, idx) => (
                      <div key={idx} className="flex flex-col text-sm p-3 border border-border-light rounded-lg">
                        <span className="font-semibold text-text">{person.name}</span>
                        <div className="flex justify-between mt-1 text-xs">
                          <span className="text-text-muted">{person.role}</span>
                          <span className={`font-medium ${person.sentiment === 'POSITIVE' ? 'text-success' : person.sentiment === 'NEGATIVE' ? 'text-error' : 'text-primary'}`}>
                            {person.sentiment}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Commitments */}
              {meetingPrepData.commitments && meetingPrepData.commitments.length > 0 && (
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-muted mb-3">
                    <CheckSquare className="h-4 w-4" /> Past Commitments
                  </h3>
                  <ul className="space-y-2">
                    {meetingPrepData.commitments.map((commitment, idx) => (
                      <li key={idx} className="text-sm p-3 border border-border-light rounded-lg flex gap-3">
                        <div className="mt-0.5">
                          {commitment.status === 'COMPLETED' ? (
                            <CheckSquare className="h-4 w-4 text-success" />
                          ) : (
                            <div className="h-4 w-4 border-2 border-text-muted rounded-sm" />
                          )}
                        </div>
                        <span className={`text-text-secondary ${commitment.status === 'COMPLETED' ? 'line-through opacity-70' : ''}`}>
                          {commitment.commitment}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
