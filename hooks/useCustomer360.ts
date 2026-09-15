"use client";

// hooks/useCustomer360.ts
// Data orchestration for the Customer 360 page.
//
// The canonical summary (Sakshi) and the relationship graph (Manish) are fetched
// independently so a failure in one never blanks the other — each section keeps
// its own loading / error / empty state and its own retry.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CustomerApiError,
  fetchCustomerById,
  fetchCustomerEngagement,
  fetchCustomerGraph,
  fetchCustomerHealth,
} from "@/lib/api/customersApi";
import type {
  CustomerGraph,
  CustomerHealth,
  CustomerSummary,
  EngagementScore,
} from "@/types/customer360";

export interface AsyncResource<T> {
  data: T | null;
  loading: boolean;
  error: CustomerApiError | null;
  reload: () => void;
}

function useAsyncResource<T>(
  key: string | null,
  loader: (key: string) => Promise<T>
): AsyncResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(key));
  const [error, setError] = useState<CustomerApiError | null>(null);
  const [nonce, setNonce] = useState(0);
  const activeKey = useRef<string | null>(null);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!key) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    activeKey.current = key;
    setLoading(true);
    setError(null);

    loader(key)
      .then((result) => {
        if (cancelled || activeKey.current !== key) return;
        setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled || activeKey.current !== key) return;
        setData(null);
        setError(
          err instanceof CustomerApiError
            ? err
            : new CustomerApiError("unknown", "Something went wrong.")
        );
      })
      .finally(() => {
        if (cancelled || activeKey.current !== key) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key, nonce, loader]);

  return { data, loading, error, reload };
}

export interface UseCustomer360Result {
  summary: AsyncResource<CustomerSummary>;
  graph: AsyncResource<CustomerGraph>;
  health: AsyncResource<CustomerHealth>;
  engagement: AsyncResource<EngagementScore>;
  graphDepth: number;
  setGraphDepth: (depth: number) => void;
}

export function useCustomer360(customerId: string | null | undefined): UseCustomer360Result {
  const id = customerId ? String(customerId) : null;
  const [graphDepth, setGraphDepth] = useState<number>(2);

  const graphLoader = useCallback(
    (key: string) => fetchCustomerGraph(key, graphDepth),
    [graphDepth]
  );

  const summary = useAsyncResource<CustomerSummary>(id, fetchCustomerById);
  const graph = useAsyncResource<CustomerGraph>(id, graphLoader);
  const health = useAsyncResource<CustomerHealth>(id, fetchCustomerHealth);
  const engagement = useAsyncResource<EngagementScore>(id, fetchCustomerEngagement);

  return {
    summary,
    graph,
    health,
    engagement,
    graphDepth,
    setGraphDepth,
  };
}

