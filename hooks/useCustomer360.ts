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
  fetchCustomerGraph,
} from "@/lib/api/customersApi";
import type { CustomerGraph, CustomerSummary } from "@/types/customer360";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce, loader]);

  return { data, loading, error, reload };
}

export interface UseCustomer360Result {
  summary: AsyncResource<CustomerSummary>;
  graph: AsyncResource<CustomerGraph>;
}

export function useCustomer360(customerId: string | null | undefined): UseCustomer360Result {
  const id = customerId ? String(customerId) : null;

  const summary = useAsyncResource<CustomerSummary>(id, fetchCustomerById);
  const graph = useAsyncResource<CustomerGraph>(id, fetchCustomerGraph);

  return { summary, graph };
}
