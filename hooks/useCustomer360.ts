"use client";

// hooks/useCustomer360.ts
// Data orchestration for the Customer 360 page.
//
// Each frozen contract is fetched as its own independent resource so a failure
// in one never blanks the others — every section keeps its own loading / error /
// empty state and its own retry:
//
//   summary        GET /api/customers/:id                       (Sakshi)
//   graph          GET /api/customers/:id/graph                  (Manish)
//   stakeholders   GET /api/customers/:companyId/relationships   (Manish)   — keyed by summary.companyId
//   intelligence   GET /crm/communication-intelligence/:leadId   (Ayush)    — keyed by summary.leadId
//
// stakeholders / intelligence stay idle until the canonical summary resolves and
// yields the join key; when the customer has no linked company / lead the
// resource is empty (not an error).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CustomerApiError,
  fetchCustomerById,
  fetchCustomerCommunicationIntelligence,
  fetchCustomerGraph,
  fetchCustomerStakeholders,
} from "@/lib/api/customersApi";
import type {
  CommunicationIntelligence,
  CustomerGraph,
  CustomerStakeholder,
  CustomerSummary,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce, loader]);

  return { data, loading, error, reload };
}

export interface UseCustomer360Result {
  summary: AsyncResource<CustomerSummary>;
  graph: AsyncResource<CustomerGraph>;
  stakeholders: AsyncResource<CustomerStakeholder[]>;
  intelligence: AsyncResource<CommunicationIntelligence | null>;
}

const loadStakeholders = (companyId: string) => fetchCustomerStakeholders(companyId);
const loadIntelligence = (leadId: string) => fetchCustomerCommunicationIntelligence(leadId);

export function useCustomer360(customerId: string | null | undefined): UseCustomer360Result {
  const id = customerId ? String(customerId) : null;

  const summary = useAsyncResource<CustomerSummary>(id, fetchCustomerById);
  const graph = useAsyncResource<CustomerGraph>(id, fetchCustomerGraph);

  const companyId = summary.data?.companyId ? String(summary.data.companyId) : null;
  const leadId = summary.data?.leadId ? String(summary.data.leadId) : null;

  const stakeholders = useAsyncResource<CustomerStakeholder[]>(companyId, loadStakeholders);
  const intelligence = useAsyncResource<CommunicationIntelligence | null>(leadId, loadIntelligence);

  return useMemo(
    () => ({ summary, graph, stakeholders, intelligence }),
    [summary, graph, stakeholders, intelligence]
  );
}
