"use client";

import React, { useMemo, useState } from "react";
import {
  Share2,
  Layers,
  User,
  Building2,
  Briefcase,
  Package,
  ArrowRight,
  Info,
  X,
  ExternalLink,
} from "lucide-react";
import type {
  CustomerGraph,
  CustomerGraphEdge,
  CustomerGraphNode,
} from "@/types/customer360";
import { ProvenanceBadge } from "../../ProvenanceBadge";

// Colors strictly mapped from CSS design tokens in global.css
const NODE_TYPE_COLORS: Record<string, { stroke: string; fill: string; text: string; bgClass: string }> = {
  PERSON: {
    stroke: "var(--color-cat-crm)",
    fill: "var(--color-cat-crm-bg)",
    text: "var(--color-cat-crm)",
    bgClass: "bg-cat-crm/10 text-cat-crm border-cat-crm/30",
  },
  CONTACT: {
    stroke: "var(--color-cat-crm)",
    fill: "var(--color-cat-crm-bg)",
    text: "var(--color-cat-crm)",
    bgClass: "bg-cat-crm/10 text-cat-crm border-cat-crm/30",
  },
  CUSTOMER: {
    stroke: "var(--color-primary)",
    fill: "var(--color-info-light)",
    text: "var(--color-primary)",
    bgClass: "bg-primary/10 text-primary border-primary/30",
  },
  COMPANY: {
    stroke: "var(--color-cat-finance)",
    fill: "var(--color-cat-finance-bg)",
    text: "var(--color-cat-finance)",
    bgClass: "bg-cat-finance/10 text-cat-finance border-cat-finance/30",
  },
  ORGANIZATION: {
    stroke: "var(--color-cat-finance)",
    fill: "var(--color-cat-finance-bg)",
    text: "var(--color-cat-finance)",
    bgClass: "bg-cat-finance/10 text-cat-finance border-cat-finance/30",
  },
  DEAL: {
    stroke: "var(--color-cat-marketing)",
    fill: "var(--color-cat-marketing-bg)",
    text: "var(--color-cat-marketing)",
    bgClass: "bg-cat-marketing/10 text-cat-marketing border-cat-marketing/30",
  },
  PRODUCT: {
    stroke: "var(--color-cat-comm)",
    fill: "var(--color-cat-comm-bg)",
    text: "var(--color-cat-comm)",
    bgClass: "bg-cat-comm/10 text-cat-comm border-cat-comm/30",
  },
  USER: {
    stroke: "var(--color-cat-projects)",
    fill: "var(--color-cat-projects-bg)",
    text: "var(--color-cat-projects)",
    bgClass: "bg-cat-projects/10 text-cat-projects border-cat-projects/30",
  },
};

const DEFAULT_NODE_COLOR = {
  stroke: "var(--color-border)",
  fill: "var(--color-background-secondary)",
  text: "var(--color-text-secondary)",
  bgClass: "bg-background-secondary text-text-secondary border-border",
};

export interface CustomerGraphCanvasProps {
  graph: CustomerGraph;
  currentDepth?: number;
  onDepthChange?: (depth: number) => void;
}

interface PositionedNode extends CustomerGraphNode {
  x: number;
  y: number;
  isRoot: boolean;
}

export function CustomerGraphCanvas({
  graph,
  currentDepth = 2,
  onDepthChange,
}: CustomerGraphCanvasProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const { nodes, edges, rootNodeId } = graph;

  // Calculate layout geometry
  const width = 640;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;

  const { positionedNodes, nodeMap } = useMemo(() => {
    const map = new Map<string, PositionedNode>();

    // Identify root node
    const root =
      nodes.find((n) => n.id === rootNodeId) ??
      nodes.find((n) => n.isRoot || n.nodeType.toUpperCase() === "CUSTOMER") ??
      nodes[0];

    const nonRootNodes = nodes.filter((n) => n.id !== root?.id);
    const count = nonRootNodes.length;
    const radius = Math.min(centerX - 60, centerY - 60, 150);

    if (root) {
      map.set(root.id, {
        ...root,
        x: centerX,
        y: centerY,
        isRoot: true,
      });
    }

    nonRootNodes.forEach((node, idx) => {
      // Radial distribution around center
      const angle = (2 * Math.PI * idx) / Math.max(count, 1) - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      map.set(node.id, {
        ...node,
        x,
        y,
        isRoot: false,
      });
    });

    return {
      positionedNodes: Array.from(map.values()),
      nodeMap: map,
    };
  }, [nodes, rootNodeId, centerX, centerY]);

  // Extract unique relationship types and node types for legend
  const uniqueRelationshipTypes = useMemo(() => {
    const set = new Set<string>();
    edges.forEach((e) => {
      if (e.relationshipType) set.add(e.relationshipType.toUpperCase());
    });
    return Array.from(set);
  }, [edges]);

  const uniqueNodeTypes = useMemo(() => {
    const set = new Set<string>();
    nodes.forEach((n) => {
      if (n.nodeType) set.add(n.nodeType.toUpperCase());
    });
    return Array.from(set);
  }, [nodes]);

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null;
  const selectedEdge = selectedEdgeId
    ? edges.find((e) => e.id === selectedEdgeId)
    : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Top bar: Depth controls & Quick Stats */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-text-muted font-medium">Traversal Depth:</span>
          <div className="flex rounded-md border border-border bg-background-secondary p-0.5">
            {[1, 2, 3].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDepthChange?.(d)}
                className={`rounded px-2 py-0.5 font-semibold transition-colors ${
                  currentDepth === d
                    ? "bg-surface text-text shadow-sm"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-text-muted">
          <span>{nodes.length} nodes</span>
          <span>•</span>
          <span>{edges.length} relationships</span>
        </div>
      </div>

      {/* SVG Canvas Box */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-background-secondary/30">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[380px] w-full select-none"
        >
          <defs>
            {/* Arrowhead marker for directed edges */}
            <marker
              id="graph-arrow"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 1 L 10 5 L 0 9 z"
                fill="var(--color-border)"
              />
            </marker>
            <marker
              id="graph-arrow-active"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 1 L 10 5 L 0 9 z"
                fill="var(--color-primary)"
              />
            </marker>
          </defs>

          {/* Edges */}
          <g>
            {edges.map((edge) => {
              const sourceNode = nodeMap.get(edge.fromNodeId);
              const targetNode = nodeMap.get(edge.toNodeId);
              if (!sourceNode || !targetNode) return null;

              const isEdgeSelected = selectedEdgeId === edge.id;
              const isConnectedToSelectedNode =
                selectedNodeId === edge.fromNodeId || selectedNodeId === edge.toNodeId;

              const midX = (sourceNode.x + targetNode.x) / 2;
              const midY = (sourceNode.y + targetNode.y) / 2;

              // Stroke width modulated by strength (1-4px)
              const strokeWidth =
                typeof edge.strength === "number"
                  ? Math.min(4, Math.max(1.5, edge.strength * 2))
                  : 1.5;

              const strokeColor = isEdgeSelected
                ? "var(--color-primary)"
                : isConnectedToSelectedNode
                ? "var(--color-primary-light)"
                : "var(--color-border)";

              return (
                <g
                  key={edge.id}
                  className="cursor-pointer transition-all"
                  onClick={() => {
                    setSelectedEdgeId(edge.id);
                    setSelectedNodeId(null);
                  }}
                >
                  <line
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke={strokeColor}
                    strokeWidth={isEdgeSelected ? strokeWidth + 1.5 : strokeWidth}
                    markerEnd={isEdgeSelected ? "url(#graph-arrow-active)" : "url(#graph-arrow)"}
                  />

                  {/* Relationship label pill */}
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-38"
                      y="-10"
                      width="76"
                      height="18"
                      rx="9"
                      fill="var(--color-surface)"
                      stroke={isEdgeSelected ? "var(--color-primary)" : "var(--color-border)"}
                      strokeWidth={isEdgeSelected ? "1.5" : "1"}
                    />
                    <text
                      x="0"
                      y="3"
                      textAnchor="middle"
                      className="fill-text-secondary text-[9px] font-bold tracking-tight uppercase"
                    >
                      {edge.relationshipType.length > 10
                        ? `${edge.relationshipType.slice(0, 9)}…`
                        : edge.relationshipType.replace(/_/g, " ")}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {positionedNodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isRoot = node.isRoot;
              const colors =
                NODE_TYPE_COLORS[node.nodeType.toUpperCase()] ?? DEFAULT_NODE_COLOR;
              const radius = isRoot ? 24 : 18;

              return (
                <g
                  key={node.id}
                  className="cursor-pointer transition-transform duration-150 hover:scale-105"
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    setSelectedEdgeId(null);
                  }}
                >
                  {/* Selection glow / halo */}
                  {isSelected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius + 6}
                      fill="none"
                      stroke="var(--color-primary)"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                      opacity="0.9"
                    />
                  )}

                  {/* Node Circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    fill={isRoot ? "var(--color-primary)" : "var(--color-surface)"}
                    stroke={isRoot ? "var(--color-primary-dark)" : colors.stroke}
                    strokeWidth={isRoot ? "3" : "2"}
                  />

                  {/* Inner text or indicator */}
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    className={`font-bold ${
                      isRoot
                        ? "fill-primary-foreground text-xs"
                        : "fill-text text-[11px]"
                    }`}
                  >
                    {isRoot ? "ROOT" : node.label.slice(0, 2).toUpperCase()}
                  </text>

                  {/* Label below node */}
                  <text
                    x={node.x}
                    y={node.y + radius + 14}
                    textAnchor="middle"
                    className="fill-text text-[10px] font-semibold tracking-tight"
                  >
                    {node.label.length > 16
                      ? `${node.label.slice(0, 15)}…`
                      : node.label}
                  </text>

                  {/* Type pill below label */}
                  <text
                    x={node.x}
                    y={node.y + radius + 25}
                    textAnchor="middle"
                    className="fill-text-muted text-[8px] font-bold uppercase tracking-wider"
                  >
                    {node.nodeType}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Selected Details Overlay */}
        {(selectedNode || selectedEdge) && (
          <div className="absolute bottom-2 left-2 right-2 rounded-xl border border-border bg-surface/95 p-3 shadow-md backdrop-blur">
            <div className="flex items-start justify-between gap-2">
              {selectedNode && (
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase ${
                        (NODE_TYPE_COLORS[selectedNode.nodeType.toUpperCase()] ??
                          DEFAULT_NODE_COLOR).bgClass
                      }`}
                    >
                      {selectedNode.nodeType}
                    </span>
                    <span className="font-bold text-text text-sm">
                      {selectedNode.label}
                    </span>
                    {selectedNode.isRoot && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        Root Customer
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                    {selectedNode.refId && (
                      <span>Ref ID: <code className="font-mono text-[11px]">{selectedNode.refId}</code></span>
                    )}
                    {selectedNode.source && (
                      <span>Source: <strong>{selectedNode.source}</strong></span>
                    )}
                  </div>

                  {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                      {Object.entries(selectedNode.metadata).map(([k, v]) => (
                        <span
                          key={k}
                          className="rounded border border-border-light bg-background-secondary px-1.5 py-0.5 text-text-secondary"
                        >
                          <strong className="text-text">{k}:</strong> {String(v)}
                        </span>
                      ))}
                    </div>
                  )}

                  {selectedNode.source && (
                    <div className="mt-1">
                      <ProvenanceBadge provenance={{ source: selectedNode.source }} />
                    </div>
                  )}
                </div>
              )}

              {selectedEdge && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase text-primary">
                      {selectedEdge.relationshipType.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-text-muted">Relationship</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-medium text-text">
                    <span>{nodeMap.get(selectedEdge.fromNodeId)?.label ?? selectedEdge.fromNodeId}</span>
                    <ArrowRight size={12} className="text-text-muted" />
                    <span>{nodeMap.get(selectedEdge.toNodeId)?.label ?? selectedEdge.toNodeId}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    {selectedEdge.strength != null && (
                      <span>Strength: <strong>{selectedEdge.strength}</strong></span>
                    )}
                    {selectedEdge.source && (
                      <span>Source: <strong>{selectedEdge.source}</strong></span>
                    )}
                  </div>

                  {selectedEdge.source && (
                    <div className="mt-1">
                      <ProvenanceBadge provenance={{ source: selectedEdge.source }} />
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setSelectedNodeId(null);
                  setSelectedEdgeId(null);
                }}
                className="rounded-lg p-1 text-text-muted hover:bg-background-secondary hover:text-text"
                title="Close inspector"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Relationship Legend */}
      <div className="flex flex-col gap-2 rounded-lg border border-border-light bg-background-secondary/30 p-2.5 text-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
          Graph Legend
        </span>

        <div className="flex flex-wrap items-center gap-3">
          {/* Node Types Legend */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-text-secondary font-medium">Node types:</span>
            {uniqueNodeTypes.map((type) => {
              const col = NODE_TYPE_COLORS[type] ?? DEFAULT_NODE_COLOR;
              return (
                <div key={type} className="flex items-center gap-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: col.stroke }}
                  />
                  <span className="text-[11px] text-text-secondary font-semibold">
                    {type}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Relationship Types Legend */}
          {uniqueRelationshipTypes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-l border-border pl-3">
              <span className="text-[11px] text-text-secondary font-medium">Relationships:</span>
              {uniqueRelationshipTypes.map((rel) => (
                <span
                  key={rel}
                  className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-bold text-text-secondary uppercase"
                >
                  {rel.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
