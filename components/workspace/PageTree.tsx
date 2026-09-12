"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WorkspacePageNode } from "@/types/workspace";
import { deleteWorkspacePage } from "@/lib/api/workspaceApi";
import { removeStoredLocalPage } from "@/hooks/useWorkspace";
import { MovePageModal } from "./MovePageModal";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Plus,
  Database,
  MoreHorizontal,
  FolderInput,
  Trash2,
} from "lucide-react";

interface PageTreeProps {
  nodes: WorkspacePageNode[];
  onAddSubpage?: (parentId: string) => void;
  onRefreshTree?: () => void;
  depth?: number;
}

const PageTreeNodeItem: React.FC<{
  node: WorkspacePageNode;
  pageTree: WorkspacePageNode[];
  onAddSubpage?: (parentId: string) => void;
  onRefreshTree?: () => void;
  depth: number;
}> = ({ node, pageTree, onAddSubpage, onRefreshTree, depth }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState<boolean>(false);
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  // Guard against literal '[id]' or missing id causing Next.js App Router dynamic href crash
  const safeId = node.id && node.id !== "[id]" && !node.id.includes("[id]") ? node.id : "";
  const targetPath = safeId ? `/workspace/pages/${safeId}` : "/workspace";
  const isActive = (pathname || "") === targetPath;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDelete = async () => {
    if (!safeId) return;
    if (!window.confirm(`Are you sure you want to delete "${node.title || "this page"}"?`)) {
      return;
    }
    try {
      await deleteWorkspacePage(safeId);
      removeStoredLocalPage(safeId);
      if (onRefreshTree) onRefreshTree();
      if (isActive) {
        router.push("/workspace");
      }
    } catch (err) {
      console.error("Failed to delete page:", err);
    }
  };

  return (
    <div className="select-none">
      <div
        className={`group relative flex items-center justify-between px-2 py-1.5 rounded-xl text-xs transition-all ${
          isActive
            ? "bg-slate-200/80 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-semibold shadow-2xs"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <div className="flex items-center space-x-1.5 flex-1 min-w-0">
          {hasChildren ? (
            <button
              type="button"
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
            <span className="flex-shrink-0 text-sm">
              {node.isFolder || node.icon === "📁" ? (
                "📁"
              ) : node.icon ? (
                node.icon
              ) : node.isDatabase ? (
                <Database className="w-3.5 h-3.5 text-purple-500" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-slate-400" />
              )}
            </span>
            <span className="truncate font-medium">{node.title || "Untitled"}</span>
          </Link>
        </div>

        {/* Hover Action Buttons */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition" ref={menuRef}>
          {onAddSubpage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (safeId) onAddSubpage(safeId);
              }}
              title="Add sub-item"
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            title="Page options"
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Context Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-2 top-7 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1 text-left animate-in fade-in duration-100">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  if (onAddSubpage && safeId) onAddSubpage(safeId);
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5 text-blue-500" />
                <span>Add Sub-item</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsMoveModalOpen(true);
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium"
              >
                <FolderInput className="w-3.5 h-3.5 text-amber-500" />
                <span>Move Page</span>
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleDelete();
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Page</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-0.5">
          {node.children!.map((child) => (
            <PageTreeNodeItem
              key={child.id}
              node={child}
              pageTree={pageTree}
              onAddSubpage={onAddSubpage}
              onRefreshTree={onRefreshTree}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* Move Page Modal */}
      {isMoveModalOpen && safeId && (
        <MovePageModal
          isOpen={isMoveModalOpen}
          pageId={safeId}
          pageTitle={node.title}
          currentParentId={node.parentId}
          pageTree={pageTree}
          onClose={() => setIsMoveModalOpen(false)}
          onSuccess={() => {
            if (onRefreshTree) onRefreshTree();
          }}
        />
      )}
    </div>
  );
};

export const PageTree: React.FC<PageTreeProps> = ({
  nodes,
  onAddSubpage,
  onRefreshTree,
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
          pageTree={nodes}
          onAddSubpage={onAddSubpage}
          onRefreshTree={onRefreshTree}
          depth={depth}
        />
      ))}
    </div>
  );
};
