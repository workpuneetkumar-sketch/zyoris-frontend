"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CustomerApiError,
  fetchCustomerEnrichmentStatus,
  refreshCustomerEnrichment,
} from "@/lib/api/customersApi";
import type {
  CustomerEnrichmentStatusResponse,
  RefreshEnrichmentPayload,
  RefreshEnrichmentResult,
} from "@/types/customer360";

export interface UseCustomerEnrichmentResult {
  status: CustomerEnrichmentStatusResponse | null;
  loading: boolean;
  refreshing: boolean;
  error: CustomerApiError | null;
  reload: () => void;
  triggerRefresh: (payload?: RefreshEnrichmentPayload) => Promise<RefreshEnrichmentResult>;
}

export function useCustomerEnrichment(customerId: string | null | undefined): UseCustomerEnrichmentResult {
  const id = customerId ? String(customerId) : null;
  const [status, setStatus] = useState<CustomerEnrichmentStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<CustomerApiError | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!id) {
      setStatus(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    fetchCustomerEnrichmentStatus(id)
      .then((res) => {
        if (!active) return;
        setStatus(res);
      })
      .catch((err) => {
        if (!active) return;
        setStatus(null);
        setError(
          err instanceof CustomerApiError
            ? err
            : new CustomerApiError("unknown", "Failed to fetch customer enrichment status.")
        );
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, nonce]);

  const triggerRefresh = useCallback(
    async (payload?: RefreshEnrichmentPayload): Promise<RefreshEnrichmentResult> => {
      if (!id) throw new CustomerApiError("not_found", "No customer id provided.", 404);
      setRefreshing(true);
      try {
        const result = await refreshCustomerEnrichment(id, payload);
        reload();
        return result;
      } finally {
        setRefreshing(false);
      }
    },
    [id, reload]
  );

  return {
    status,
    loading,
    refreshing,
    error,
    reload,
    triggerRefresh,
  };
}
