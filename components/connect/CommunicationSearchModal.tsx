"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  Loader2,
  Hash,
  MessageSquare,
  ArrowRight,
  Filter,
} from "lucide-react";
import { SearchMessageResult } from "@/types/connect";
import { searchCommunications } from "@/lib/api/connectApi";

interface CommunicationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChannelId?: string | null;
  currentChannelName?: string | null;
  currentConversationId?: string | null;
  onSelectResult: (result: SearchMessageResult) => void;
}

export default function CommunicationSearchModal({
  isOpen,
  onClose,
  currentChannelId,
  currentChannelName,
  currentConversationId,
  onSelectResult,
}: CommunicationSearchModalProps) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "current">("all");
  const [results, setResults] = useState<SearchMessageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setSearched(false);
      setNextCursor(null);
    }
  }, [isOpen]);

  // Debounced search trigger
  useEffect(() => {
    if (!isOpen) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query.trim(), scope, false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, scope, isOpen]);

  const performSearch = async (q: string, searchScope: "all" | "current", append = false, cursor?: string) => {
    if (!q) return;

    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const channelId = searchScope === "current" && currentChannelId ? currentChannelId : undefined;
      const conversationId = searchScope === "current" && currentConversationId ? currentConversationId : undefined;

      const res = await searchCommunications({
        q,
        channelId,
        conversationId,
        limit: 50,
        cursor,
      });

      if (append) {
        setResults((prev) => [...prev, ...res.data]);
      } else {
        setResults(res.data);
      }
      setNextCursor(res.nextCursor || null);
      setSearched(true);
    } catch (err) {
      console.error("Failed to search communications:", err);
      if (!append) setResults([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!nextCursor || loadingMore) return;
    performSearch(query.trim(), scope, true, nextCursor);
  };

  if (!isOpen) return null;

  // Highlight query term in result snippet
  const highlightSnippet = (content: string, term: string) => {
    if (!term) return content;
    const parts = content.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase() ? (
        <mark key={i} className="bg-primary/20 text-primary font-bold rounded-xs px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const hasCurrentContext = Boolean(currentChannelId || currentConversationId);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-surface rounded-2xl border border-border shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-hover flex items-center justify-center text-primary shrink-0 border border-border">
              <Search size={18} />
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages, files, and discussions..."
              className="flex-1 bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
            />

            {loading && <Loader2 size={18} className="animate-spin text-primary shrink-0" />}

            {query && !loading && (
              <button
                onClick={() => setQuery("")}
                className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-hover"
              >
                <X size={16} />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover text-xs font-semibold px-2 border border-border"
            >
              Esc
            </button>
          </div>

          {/* Scope filter pills */}
          {hasCurrentContext && (
            <div className="mt-3 flex items-center gap-2 pt-2 border-t border-border/50 text-xs">
              <span className="text-text-muted flex items-center gap-1 text-[11px] font-semibold">
                <Filter size={12} /> Scope:
              </span>
              <button
                onClick={() => setScope("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  scope === "all"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-surface-hover text-text-secondary hover:text-text border border-border"
                }`}
              >
                All Communications
              </button>
              <button
                onClick={() => setScope("current")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  scope === "current"
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-surface-hover text-text-secondary hover:text-text border border-border"
                }`}
              >
                Current {currentChannelId ? `#${currentChannelName || "channel"}` : "Chat"} Only
              </button>
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {!searched && !loading && (
            <div className="py-16 text-center text-text-muted space-y-2">
              <Search size={32} className="mx-auto text-text-muted opacity-40" />
              <p className="text-xs font-medium text-text">Type to search communication history</p>
              <p className="text-[11px] text-text-muted">
                Find conversations by keywords, topics, or shared messages.
              </p>
            </div>
          )}

          {searched && !loading && results.length === 0 && (
            <div className="py-16 text-center text-text-muted space-y-2">
              <p className="text-sm font-semibold text-text">No matching messages found</p>
              <p className="text-xs text-text-muted max-w-xs mx-auto">
                No communications matched "{query}". Try checking for spelling or searching across all conversations.
              </p>
            </div>
          )}

          {results.map((result) => {
            const author = result.sender?.name || "Teammate";
            const time = new Date(result.createdAt).toLocaleDateString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const location = result.channelName
              ? `#${result.channelName}`
              : result.conversationName || (result.channelId ? "Channel" : "Direct Message");

            return (
              <div
                key={result.id}
                onClick={() => {
                  onSelectResult(result);
                  onClose();
                }}
                className="group p-3 rounded-xl bg-surface-hover hover:bg-surface border border-border hover:border-primary cursor-pointer transition-all space-y-1.5 shadow-xs"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text">{author}</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface text-[10px] font-semibold text-text-muted border border-border">
                      {result.channelId ? <Hash size={10} /> : <MessageSquare size={10} />}
                      <span>{location}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-text-muted group-hover:text-primary transition-colors">
                    <span className="text-[10px]">{time}</span>
                    <ArrowRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                <p className="text-xs text-text leading-relaxed line-clamp-2">
                  {highlightSnippet(result.content, query)}
                </p>
              </div>
            );
          })}

          {nextCursor && (
            <div className="pt-2 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-4 py-1.5 rounded-xl border border-border text-xs font-semibold text-text hover:bg-surface-hover transition-colors disabled:opacity-50"
              >
                {loadingMore ? "Loading more..." : "Load More Results"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
