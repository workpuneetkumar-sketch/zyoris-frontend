"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CustomerApiError,
  fetchCustomerEngagementHistory,
  fetchCustomerHealthHistory,
  recalculateCustomerHealth,
} from "@/lib/api/customersApi";
import type {
  CustomerEngagementHistoryResponse,
  CustomerHealthHistoryResponse,
  HealthCalculateResult,
} from "@/types/customer360";

export interface UseCustomerScoreHistoryResult {
  healthHistory: CustomerHealthHistoryResponse | null;
  healthLoading: boolean;
  healthError: CustomerApiError | null;
  engagementHistory: CustomerEngagementHistoryResponse | null;
  engagementLoading: boolean;
  engagementError: CustomerApiError | null;
  recalculating: boolean;
  recalculateError: CustomerApiError | null;
  reloadHealthHistory: () => void;
  reloadEngagementHistory: () => void;
  triggerRecalculate: () => Promise<HealthCalculateResult>;
  setHealthPage: (offset: number, limit?: number) => void;
  setEngagementPage: (offset: number, limit?: number) => void;
}

export function useCustomerScoreHistory(
  customerId: string | null | undefined
): UseCustomerScoreHistoryResult {
  const id = customerId ? String(customerId) : null;

  const [healthOffset, setHealthOffset] = useState(0);
  const [healthLimit, setHealthLimit] = useState(10);
  const [healthHistory, setHealthHistory] = useState<CustomerHealthHistoryResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(Boolean(id));
  const [healthError, setHealthError] = useState<CustomerApiError | null>(null);
  const [healthNonce, setHealthNonce] = useState(0);

  const [engagementOffset, setEngagementOffset] = useState(0);
  const [engagementLimit, setEngagementLimit] = useState(10);
  const [engagementHistory, setEngagementHistory] =
    useState<CustomerEngagementHistoryResponse | null>(null);
  const [engagementLoading, setEngagementLoading] = useState<boolean>(Boolean(id));
  const [engagementError, setEngagementError] = useState<CustomerApiError | null>(null);
  const [engagementNonce, setEngagementNonce] = useState(0);

  const [recalculating, setRecalculating] = useState<boolean>(false);
  const [recalculateError, setRecalculateError] = useState<CustomerApiError | null>(null);

  const reloadHealthHistory = useCallback(() => setHealthNonce((n) => n + 1), []);
  const reloadEngagementHistory = useCallback(() => setEngagementNonce((n) => n + 1), []);

  const setHealthPage = useCallback((offset: number, limit?: number) => {
    setHealthOffset(offset);
    if (limit) setHealthLimit(limit);
  }, []);

  const setEngagementPage = useCallback((offset: number, limit?: number) => {
    setEngagementOffset(offset);
    if (limit) setEngagementLimit(limit);
  }, []);

  // Fetch Health History
  useEffect(() => {
    if (!id) {
      setHealthHistory(null);
      setHealthLoading(false);
      setHealthError(null);
      return;
    }

    let active = true;
    setHealthLoading(true);
    setHealthError(null);

    fetchCustomerHealthHistory(id, { limit: healthLimit, offset: healthOffset })
      .then((res) => {
        if (!active) return;
        setHealthHistory(res);
      })
      .catch((err) => {
        if (!active) return;
        setHealthHistory(null);
        setHealthError(
          err instanceof CustomerApiError
            ? err
            : new CustomerApiError("unknown", "Failed to fetch health score history.")
        );
      })
      .finally(() => {
        if (!active) return;
        setHealthLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, healthLimit, healthOffset, healthNonce]);

  // Fetch Engagement History
  useEffect(() => {
    if (!id) {
      setEngagementHistory(null);
      setEngagementLoading(false);
      setEngagementError(null);
      return;
    }

    let active = true;
    setEngagementLoading(true);
    setEngagementError(null);

    fetchCustomerEngagementHistory(id, { limit: engagementLimit, offset: engagementOffset })
      .then((res) => {
        if (!active) return;
        setEngagementHistory(res);
      })
      .catch((err) => {
        if (!active) return;
        setEngagementHistory(null);
        setEngagementError(
          err instanceof CustomerApiError
            ? err
            : new CustomerApiError("unknown", "Failed to fetch engagement score history.")
        );
      })
      .finally(() => {
        if (!active) return;
        setEngagementLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, engagementLimit, engagementOffset, engagementNonce]);

  const triggerRecalculate = useCallback(async (): Promise<HealthCalculateResult> => {
    if (!id) throw new CustomerApiError("not_found", "No customer id provided.", 404);
    setRecalculating(true);
    setRecalculateError(null);
    try {
      const res = await recalculateCustomerHealth(id);
      // Reload health history & current health snapshot
      reloadHealthHistory();
      return res;
    } catch (err) {
      const apiErr =
        err instanceof CustomerApiError
          ? err
          : new CustomerApiError("unknown", "Failed to recalculate health score.");
      setRecalculateError(apiErr);
      throw apiErr;
    } finally {
      setRecalculating(false);
    }
  }, [id, reloadHealthHistory]);

  return {
    healthHistory,
    healthLoading,
    healthError,
    engagementHistory,
    engagementLoading,
    engagementError,
    recalculating,
    recalculateError,
    reloadHealthHistory,
    reloadEngagementHistory,
    triggerRecalculate,
    setHealthPage,
    setEngagementPage,
  };
}
