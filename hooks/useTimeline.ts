// hooks/useTimeline.ts
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchTimeline } from "@/lib/api/timelineApi";
import {
  TimelineItem,
  TimelineFilters,
  TimelineGroup,
  DEFAULT_TIMELINE_FILTERS,
  TIMELINE_PAGE_SIZE,
} from "@/types/timeline";

function groupByDate(items: TimelineItem[]): TimelineGroup[] {
  const groups = new Map<string, TimelineItem[]>();
  const now = new Date();

  items.forEach((item) => {
    const itemDate = new Date(item.timestamp);
    const diffMs = now.getTime() - itemDate.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    let label: string;
    if (diffDays === 0) {
      label = "Today";
    } else if (diffDays === 1) {
      label = "Yesterday";
    } else if (diffDays <= 7) {
      label = "This Week";
    } else if (diffDays <= 30) {
      label = "This Month";
    } else {
      label = itemDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }

    const dateKey = itemDate.toISOString().split("T")[0];
    const groupKey = `${label}__${dateKey}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(item);
  });

  return Array.from(groups.entries()).map(([key, items]) => ({
    date: key.split("__")[1],
    label: key.split("__")[0],
    items,
  }));
}

export function useTimeline() {
  const [allItems, setAllItems] = useState<TimelineItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState<TimelineFilters>(DEFAULT_TIMELINE_FILTERS);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadTimeline = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const result = await fetchTimeline(pageNum, filters);
        if (append) {
          setAllItems((prev) => [...prev, ...result.items]);
        } else {
          setAllItems(result.items);
        }
        setTotal(result.total);
        setHasMore(result.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load timeline.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    setPage(1);
    setAllItems([]);
    loadTimeline(1, false);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadTimeline(nextPage, true);
  }, [hasMore, loadingMore, page, loadTimeline]);

  const groupedItems = useMemo(() => groupByDate(allItems), [allItems]);

  function handleFiltersChange(next: Partial<TimelineFilters>) {
    setFilters((prev) => ({ ...prev, ...next }));
  }

  function handleResetFilters() {
    setFilters(DEFAULT_TIMELINE_FILTERS);
  }

  function handleOpenDrawer(item: TimelineItem) {
    setSelectedItem(item);
    setDrawerOpen(true);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setSelectedItem(null);
  }

  return {
    allItems,
    groupedItems,
    page,
    total,
    hasMore,
    filters,
    loading,
    loadingMore,
    error,
    selectedItem,
    drawerOpen,
    loadMore,
    handleFiltersChange,
    handleResetFilters,
    handleOpenDrawer,
    handleCloseDrawer,
    retry: () => loadTimeline(1, false),
  };
}
