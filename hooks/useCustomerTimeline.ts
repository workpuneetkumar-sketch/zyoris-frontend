"use client";

// hooks/useCustomerTimeline.ts
// Cursor-paginated feed for the Customer 360 Timeline section.
//
// Wired directly to Prashant's timeline API:
//   GET /api/customers/:id/timeline?cursor=&types=&from=&to=
//
// Filters are sent verbatim as backend `eventType` values — there is no
// client-side re-mapping or mock layer. `knownEventTypes` is the set of event
// types actually observed for this customer; the filter UI is built from it so
// every value we send back is one the backend already produced.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CustomerApiError, fetchCustomerTimeline } from "@/lib/api/customersApi";
import {
  EMPTY_TIMELINE_FILTERS,
  type CustomerTimelineEvent,
  type CustomerTimelineFilters,
  type CustomerTimelineQuery,
} from "@/types/customer360";

export interface UseCustomerTimelineResult {
  events: CustomerTimelineEvent[];
  loading: boolean; // initial load / filter change
  loadingMore: boolean;
  error: CustomerApiError | null;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;

  filters: CustomerTimelineFilters;
  setFilters: (patch: Partial<CustomerTimelineFilters>) => void;
  clearFilters: () => void;
  isFiltered: boolean;

  /** Distinct `eventType` values seen for this customer, sorted, for the filter UI. */
  knownEventTypes: string[];
}

function toQuery(filters: CustomerTimelineFilters): CustomerTimelineQuery {
  const q: CustomerTimelineQuery = {};
  if (filters.types.length) q.types = filters.types.join(",");
  if (filters.from) q.from = filters.from;
  if (filters.to) q.to = filters.to;
  return q;
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
  const [filters, setFiltersState] = useState<CustomerTimelineFilters>(
    EMPTY_TIMELINE_FILTERS
  );
  const [knownEventTypes, setKnownEventTypes] = useState<string[]>([]);

  const activeId = useRef<string | null>(null);
  const filtersKey = JSON.stringify(filters);

  const rememberTypes = useCallback((batch: CustomerTimelineEvent[]) => {
    if (!batch.length) return;
    setKnownEventTypes((prev) => {
      const next = new Set(prev);
      for (const e of batch) if (e.eventType) next.add(e.eventType);
      return next.size === prev.length ? prev : [...next].sort();
    });
  }, []);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const setFilters = useCallback((patch: Partial<CustomerTimelineFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearFilters = useCallback(
    () => setFiltersState(EMPTY_TIMELINE_FILTERS),
    []
  );

  // Reset the discovered-type vocabulary when the customer changes.
  useEffect(() => {
    setKnownEventTypes([]);
    setFiltersState(EMPTY_TIMELINE_FILTERS);
  }, [id]);

  // Initial load + reload + refetch on filter change.
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

    fetchCustomerTimeline(id, toQuery(filters))
      .then((page) => {
        if (cancelled || activeId.current !== id) return;
        setEvents(page.events);
        setCursor(page.nextCursor);
        setHasMore(Boolean(page.nextCursor));
        rememberTypes(page.events);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, nonce, filtersKey, rememberTypes]);

  const loadMore = useCallback(() => {
    if (!id || !cursor || loadingMore) return;
    setLoadingMore(true);
    fetchCustomerTimeline(id, { ...toQuery(filters), cursor })
      .then((page) => {
        if (activeId.current !== id) return;
        setEvents((prev) => [...prev, ...page.events]);
        setCursor(page.nextCursor);
        setHasMore(Boolean(page.nextCursor));
        rememberTypes(page.events);
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
  }, [id, cursor, loadingMore, filters, rememberTypes]);

  const isFiltered = useMemo(
    () => filters.types.length > 0 || Boolean(filters.from) || Boolean(filters.to),
    [filters]
  );

  return {
    events,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    reload,
    filters,
    setFilters,
    clearFilters,
    isFiltered,
    knownEventTypes,
  };
}
