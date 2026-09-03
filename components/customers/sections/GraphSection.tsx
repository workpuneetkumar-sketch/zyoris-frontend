"use client";

import React, { useState } from "react";
import { Share2, Network, ListFilter } from "lucide-react";
import type { AsyncResource } from "@/hooks/useCustomer360";
import type { CustomerGraph, CustomerGraphNode } from "@/types/customer360";
import { SectionCard } from "../SectionCard";
import { SectionEmpty, SectionError, SectionLoading } from "../SectionStates";
import { ProvenanceBadge } from "../ProvenanceBadge";
import { CustomerGraphCanvas } from "./graph/CustomerGraphCanvas";

export interface GraphSectionProps {
  graph: AsyncResource<CustomerGraph>;
  depth?: number;
  onDepthChange?: (depth: number) => void;
}

export function GraphSection({ graph, depth = 2, onDepthChange }: GraphSectionProps) {
  const [viewMode, setViewMode] = useState<"canvas" | "list">("canvas");

  return (
    <SectionCard
      id="graph"
      title="Relationship Graph"
      icon={Share2}
      description="Interactive map of customer relationships, accounts, people, and deals"
      action={
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-lg border border-border bg-background-secondary p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("canvas")}
              className={`flex items-center gap-1 rounded-md px-2 py-1 font-semibold transition-colors ${
                viewMode === "canvas"
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-secondary hover:text-text"
              }`}
              title="Interactive Visual Graph"
            >
              <Network size={13} />
              Canvas
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1 rounded-md px-2 py-1 font-semibold transition-colors ${
                viewMode === "list"
                  ? "bg-surface text-text shadow-sm"
                  : "text-text-secondary hover:text-text"
              }`}
              title="Hierarchical List View"
            >
              <ListFilter size={13} />
              List
            </button>
          </div>
          <button
            type="button"
            onClick={graph.reload}
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text hover:bg-surface-hover"
          >
            Refresh
          </button>
        </div>
      }
    >
      {graph.loading ? (
        <SectionLoading label="Loading relationship graph…" />
      ) : graph.error ? (
        <SectionError message={graph.error.message} onRetry={graph.reload} />
      ) : !graph.data || graph.data.nodes.length === 0 ? (
        <SectionEmpty
          title="No relationships mapped"
          description="Once connected companies, contacts and deals are linked, the graph will render here."
        />
      ) : viewMode === "canvas" ? (
        <CustomerGraphCanvas
          graph={graph.data}
          currentDepth={depth}
          onDepthChange={onDepthChange}
        />
      ) : (
        <GraphListView graph={graph.data} />
      )}
    </SectionCard>
  );
}

function GraphListView({ graph }: { graph: CustomerGraph }) {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const root =
    graph.nodes.find((n) => n.id === graph.rootNodeId) ??
    graph.nodes.find((n) => n.isRoot) ??
    graph.nodes.find((n) => n.nodeType.toUpperCase() === "CUSTOMER") ??
    graph.nodes[0];

  const groups = new Map<string, Array<{ node: CustomerGraphNode; label?: string | null; strength?: number | null }>>();

  for (const edge of graph.edges) {
    let connectedId: string | null = null;
    const fromId = edge.fromNodeId || edge.source;
    const toId = edge.toNodeId || edge.target;

    if (fromId === root?.id) connectedId = toId ?? null;
    else if (toId === root?.id) connectedId = fromId ?? null;
    if (!connectedId) continue;

    const node = nodeById.get(connectedId);
    if (!node) continue;

    const nodeType = node.nodeType || "RELATED";
    if (!groups.has(nodeType)) groups.set(nodeType, []);
    groups.get(nodeType)!.push({
      node,
      label: edge.relationshipType || edge.label || null,
      strength: edge.strength,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Root Node Summary */}
      <div className="flex items-center gap-2 rounded-xl border border-border-light bg-background-secondary/60 p-3">
        <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold text-primary uppercase">
          {root ? root.nodeType : "Root"}
        </span>
        <span className="text-sm font-semibold text-text">{root?.label ?? "This customer"}</span>
        {root?.source ? (
          <ProvenanceBadge provenance={{ source: root.source }} />
        ) : root?.provenance ? (
          <ProvenanceBadge provenance={root.provenance} />
        ) : null}
      </div>

      {/* Grouped Connected Nodes */}
      {[...groups.entries()].map(([type, entries]) => (
        <div key={type}>
          <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
            {type.replace(/_/g, " ")} · {entries.length}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {entries.map(({ node, label, strength }) => (
              <li
                key={node.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border-light bg-surface px-3 py-2 text-sm"
              >
                <span className="font-semibold text-text">{node.label}</span>
                {label && (
                  <span className="rounded bg-background-secondary px-1.5 py-0.5 text-[10px] font-bold text-text-secondary uppercase">
                    {label.replace(/[_-]+/g, " ")}
                  </span>
                )}
                {strength != null && (
                  <span className="text-[11px] text-text-muted">
                    strength: {strength}
                  </span>
                )}
                {node.source ? (
                  <ProvenanceBadge provenance={{ source: node.source }} className="ml-auto" />
                ) : node.provenance ? (
                  <ProvenanceBadge provenance={node.provenance} className="ml-auto" />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {graph.generatedAt && (
        <p className="text-[11px] text-text-muted">
          Graph generated {new Date(graph.generatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

