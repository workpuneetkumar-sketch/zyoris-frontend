"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, User, Briefcase, Users, Building2, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { searchCrm, SearchResult } from "@/lib/api/crmApi";

const getIconForType = (type: SearchResult["type"]) => {
  switch (type) {
    case "Lead":
      return <User size={14} />;
    case "Deal":
      return <Briefcase size={14} />;
    case "Contact":
      return <Users size={14} />;
    case "Company":
      return <Building2 size={14} />;
  }
};

export function CrmSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setIsOpen(true);

    try {
      const data = await searchCrm(searchQuery);
      const flattenedResults: SearchResult[] = [
        ...(data.leads || []),
        ...(data.deals || []),
        ...(data.contacts || []),
        ...(data.companies || []),
      ];
      setResults(flattenedResults);
      setSelectedIndex(-1);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Search error:", err);
        setResults([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        handleSearch(query.trim());
      }, 300);
    } else {
      setResults([]);
      setIsOpen(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, handleSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const navigateToResult = useCallback((result: SearchResult) => {
    switch (result.type) {
      case "Lead":
        router.push(`/leads/${result.id}`);
        break;
      case "Deal":
        router.push(`/deals/${result.id}`);
        break;
      case "Contact":
        router.push("/contacts");
        break;
      case "Company":
        router.push("/companies");
        break;
    }
    setIsOpen(false);
    setQuery("");
  }, [router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, results.length - 1)
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.max(prev - 1, 0)
          );
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            navigateToResult(results[selectedIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [results, selectedIndex, navigateToResult]
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search leads, deals, contacts, companies..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="w-full md:w-80 pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        {loading && (
          <Loader2
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
          />
        )}
        {query && !loading && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 md:w-80 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 size={20} className="animate-spin mr-2" />
              <span className="text-sm">Searching...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p className="text-sm">No matching CRM records</p>
            </div>
          ) : (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => navigateToResult(result)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                    index === selectedIndex ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-gray-500">
                      {getIconForType(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {result.title}
                      </p>
                      {result.secondary && (
                        <p className="text-xs text-gray-500 truncate">
                          {result.secondary}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">
                      {result.type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
