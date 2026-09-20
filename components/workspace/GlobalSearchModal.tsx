"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  searchWorkspace,
  WorkspaceSearchResponse,
  WorkspaceSearchResultItem,
} from "@/lib/api/searchApi";
import {
  Search,
  X,
  FileText,
  Database,
  Layers,
  Loader2,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Command,
} from "lucide-react";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [mounted, setMounted] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"ALL" | "PAGES" | "BLOCKS" | "DATABASES">("ALL");
  const [searchResults, setSearchResults] = useState<WorkspaceSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSearchResults(null);
    }
  }, [isOpen]);

  // Debounced search API caller
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchWorkspace({ q: query.trim(), limit: 20 });
        setSearchResults(res);
        setSelectedIndex(0);
      } catch (e) {
        console.error("Global search error:", e);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Flattened items based on active tab
  const getDisplayItems = useCallback((): { item: WorkspaceSearchResultItem; category: "page" | "block" | "database" }[] => {
    if (!searchResults) return [];
    const list: { item: WorkspaceSearchResultItem; category: "page" | "block" | "database" }[] = [];

    if (activeTab === "ALL" || activeTab === "PAGES") {
      searchResults.results.pages.items.forEach((p) => list.push({ item: p, category: "page" }));
    }
    if (activeTab === "ALL" || activeTab === "BLOCKS") {
      searchResults.results.blocks.items.forEach((b) => list.push({ item: b, category: "block" }));
    }
    if (activeTab === "ALL" || activeTab === "DATABASES") {
      searchResults.results.databases.items.forEach((d) => list.push({ item: d, category: "database" }));
    }

    return list;
  }, [searchResults, activeTab]);

  const displayItems = getDisplayItems();

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < displayItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : displayItems.length - 1));
    } else if (e.key === "Enter" && displayItems[selectedIndex]) {
      e.preventDefault();
      const target = displayItems[selectedIndex];
      handleSelectResult(target.item, target.category);
    }
  };

  const handleSelectResult = (item: WorkspaceSearchResultItem, category: string) => {
    onClose();
    if (category === "page" || item.pageId) {
      const pageId = item.pageId || item.id;
      router.push(`/workspace/pages/${pageId}`);
    } else if (category === "database") {
      router.push(`/workspace/databases?id=${item.id}`);
    } else {
      router.push("/workspace");
    }
  };

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-16 md:pt-24 px-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, block content, databases... (Esc to close)"
            className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          {isLoading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0 ml-2" />}
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tab Filters */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 text-xs font-medium text-slate-500">
          <div className="flex items-center space-x-1">
            {(["ALL", "PAGES", "BLOCKS", "DATABASES"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 rounded-lg transition capitalize ${
                  activeTab === tab
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-2xs"
                    : "hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {tab.toLowerCase()}
              </button>
            ))}
          </div>

          <span className="text-[10px] text-slate-400 hidden sm:inline-block font-mono">
            {displayItems.length} result{displayItems.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Search Results Area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[220px]">
          {!query.trim() ? (
            <div className="py-12 text-center text-slate-400">
              <Command className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-medium">Type a search term to find workspace items...</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Searches Page titles, Notion block text, and Database structures.
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-2 p-3 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
              ))}
            </div>
          ) : displayItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                No matching results found
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Try searching for another keyword or title.
              </p>
            </div>
          ) : (
            displayItems.map(({ item, category }, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${category}-${item.id}-${idx}`}
                  onClick={() => handleSelectResult(item, category)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                      {category === "page" ? (
                        <span className="text-base">{item.icon || "📄"}</span>
                      ) : category === "database" ? (
                        <Database className="w-4 h-4 text-purple-500" />
                      ) : (
                        <Layers className="w-4 h-4 text-blue-500" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-semibold truncate">
                        {item.title || item.name || item.text || "Untitled Item"}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate mt-0.5">
                        {category === "page"
                          ? "Workspace Page"
                          : category === "database"
                          ? "Database View"
                          : `Block in Page ${item.pageId ? `(#${item.pageId.slice(0, 8)})` : ""}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-500">
                      {category}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="font-semibold text-blue-500">Permission Filtered Search</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
