"use client";

// hooks/useCustomerTimeline.ts
// Cursor-paginated feed for the Customer 360 Timeline section.

import { useCallback, useEffect, useRef, useState } from "react";
import { CustomerApiError, fetchCustomerTimeline } from "@/lib/api/customersApi";
import type { CustomerTimelineEvent } from "@/types/customer360";

export interface UseCustomerTimelineResult {
  events: CustomerTimelineEvent[];
  loading: boolean; // initial load
  loadingMore: boolean;
  error: CustomerApiError | null;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
}

export function useCustomerTimeline(
  customerId: string | null | undefined
): UseCustomerTimelineResult {
  const id = customerId ? String(customerId) : null;

  const [events, setEvents] = useState<CustomerTimelineEvent[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<CustomerApiError | null>(null);
  const [nonce, setNonce] = useState(0);
  const activeId = useRef<string | null>(null);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // Initial / reload fetch.
  useEffect(() => {
    if (!id) {
      setEvents([]);
      setCursor(null);
      setHasMore(false);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    activeId.current = id;
    setLoading(true);
    setError(null);
    setEvents([]);
    setCursor(null);
    setHasMore(false);

    fetchCustomerTimeline(id)
      .then((page) => {
        if (cancelled || activeId.current !== id) return;
        setEvents(page.events);
        setCursor(page.nextCursor);
        setHasMore(Boolean(page.nextCursor));
      })
      .catch((err: unknown) => {
        if (cancelled || activeId.current !== id) return;
        setError(
          err instanceof CustomerApiError
            ? err
            : new CustomerApiError("unknown", "Failed to load the timeline.")
        );
      })
      .finally(() => {
        if (cancelled || activeId.current !== id) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  const loadMore = useCallback(() => {
    if (!id || !cursor || loadingMore) return;
    setLoadingMore(true);
    fetchCustomerTimeline(id, { cursor })
      .then((page) => {
        if (activeId.current !== id) return;
        setEvents((prev) => [...prev, ...page.events]);
        setCursor(page.nextCursor);
        setHasMore(Boolean(page.nextCursor));
      })
      .catch((err: unknown) => {
        if (activeId.current !== id) return;
        setError(
          err instanceof CustomerApiError
            ? err
            : new CustomerApiError("unknown", "Failed to load more events.")
        );
      })
      .finally(() => {
        if (activeId.current !== id) return;
        setLoadingMore(false);
      });
  }, [id, cursor, loadingMore]);

  return { events, loading, loadingMore, error, hasMore, loadMore, reload };
}
