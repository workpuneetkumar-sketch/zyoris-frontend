"use client";

import { Share2 } from "lucide-react";
import type { AsyncResource } from "@/hooks/useCustomer360";
import type { CustomerGraph, CustomerGraphNode } from "@/types/customer360";
import { SectionCard } from "../SectionCard";
import { SectionEmpty, SectionError, SectionLoading } from "../SectionStates";
import { ProvenanceBadge } from "../ProvenanceBadge";

const NODE_TYPE_LABELS: Record<string, string> = {
  customer: "Customer",
  company: "Company",
  contact: "Contact",
  person: "Person",
  stakeholder: "Stakeholder",
  deal: "Deal",
  user: "Team member",
  product: "Product",
  subscription: "Subscription",
  interaction: "Interaction",
  document: "Document",
  payment: "Payment",
  ai_action: "AI action",
  parent_account: "Parent account",
  subsidiary: "Subsidiary",
};

/**
 * Shell rendering of the relationship graph: a grouped adjacency list keyed off
 * the root node. A visual graph canvas can replace the body later without
 * touching this section's boundary or data contract.
 */
export function GraphSection({ graph }: { graph: AsyncResource<CustomerGraph> }) {
  return (
    <SectionCard
      id="graph"
      title="Relationship Graph"
      icon={Share2}
      description="How this customer connects to companies, people and deals"
      action={
        <button
          type="button"
          onClick={graph.reload}
          className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text hover:bg-surface-hover"
        >
          Refresh
        </button>
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
      ) : (
        <GraphBody graph={graph.data} />
      )}
    </SectionCard>
  );
}

function GraphBody({ graph }: { graph: CustomerGraph }) {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const root =
    graph.nodes.find((n) => n.isRoot) ??
    graph.nodes.find((n) => n.type === "customer") ??
    graph.nodes[0];

  const groups = new Map<string, Array<{ node: CustomerGraphNode; label?: string | null }>>();
  for (const edge of graph.edges) {
    let connectedId: string | null = null;
    if (edge.source === root?.id) connectedId = edge.target;
    else if (edge.target === root?.id) connectedId = edge.source;
    if (!connectedId) continue;

    const node = nodeById.get(connectedId);
    if (!node) continue;

    if (!groups.has(node.type)) groups.set(node.type, []);
    groups.get(node.type)!.push({ node, label: edge.label ?? edge.kind ?? null });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-xl border border-border-light bg-background-secondary/60 p-3">
        <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
          {root ? NODE_TYPE_LABELS[root.type] ?? root.type : "Root"}
        </span>
        <span className="text-sm font-semibold text-text">{root?.label ?? "This customer"}</span>
        {root?.provenance ? <ProvenanceBadge provenance={root.provenance} /> : null}
      </div>

      {[...groups.entries()].map(([type, entries]) => (
        <div key={type}>
          <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-text-muted">
            {NODE_TYPE_LABELS[type] ?? type} · {entries.length}
          </h3>
          <ul className="flex flex-col gap-1.5">
            {entries.map(({ node, label }) => (
              <li
                key={node.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border-light px-3 py-2 text-sm"
              >
                <span className="font-medium text-text">{node.label}</span>
                {label && (
                  <span className="text-xs text-text-secondary">
                    ({label.replace(/[_-]+/g, " ")})
                  </span>
                )}
                {node.provenance ? <ProvenanceBadge provenance={node.provenance} /> : null}
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
