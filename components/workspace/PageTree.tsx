"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WorkspacePageNode } from "@/types/workspace";
import { ChevronRight, ChevronDown, FileText, Plus, Database } from "lucide-react";

interface PageTreeProps {
  nodes: WorkspacePageNode[];
  onAddSubpage?: (parentId: string) => void;
  depth?: number;
}

const PageTreeNodeItem: React.FC<{
  node: WorkspacePageNode;
  onAddSubpage?: (parentId: string) => void;
  depth: number;
}> = ({ node, onAddSubpage, depth }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const pathname = usePathname();

  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const targetPath = `/workspace/pages/${node.id}`;
  const isActive = (pathname || "") === targetPath;

  return (
    <div className="select-none">
      <div
        className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-colors ${
          isActive
            ? "bg-slate-200/70 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <div className="flex items-center space-x-1.5 flex-1 min-w-0">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-0.5 rounded hover:bg-slate-300/50 dark:hover:bg-slate-700 text-slate-400"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <span className="w-3.5 h-3.5" />
          )}

          <Link
            href={targetPath}
            className="flex items-center space-x-2 flex-1 min-w-0 truncate"
          >
            <span className="flex-shrink-0 text-base">
              {node.icon ? (
                node.icon
              ) : node.isDatabase ? (
                <Database className="w-4 h-4 text-emerald-500" />
              ) : (
                <FileText className="w-4 h-4 text-slate-400" />
              )}
            </span>
            <span className="truncate text-xs font-medium">{node.title || "Untitled"}</span>
          </Link>
        </div>

        {onAddSubpage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddSubpage(node.id);
            }}
            title="Add subpage"
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-0.5">
          {node.children!.map((child) => (
            <PageTreeNodeItem
              key={child.id}
              node={child}
              onAddSubpage={onAddSubpage}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const PageTree: React.FC<PageTreeProps> = ({
  nodes,
  onAddSubpage,
  depth = 0,
}) => {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="px-3 py-3 text-xs text-slate-400 dark:text-slate-500 italic">
        No pages created yet.
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <PageTreeNodeItem
          key={node.id}
          node={node}
          onAddSubpage={onAddSubpage}
          depth={depth}
        />
      ))}
    </div>
  );
};
