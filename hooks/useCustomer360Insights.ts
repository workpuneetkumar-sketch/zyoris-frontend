import { useState, useEffect } from "react";
import { aiCustomer360Api, Customer360InsightsResponse } from "@/lib/api/aiCustomer360Api";

export function useCustomer360Insights(customerId: string) {
  const [data, setData] = useState<Customer360InsightsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchInsights() {
      if (!customerId) return;
      setLoading(true);
      setError(null);
      try {
        const context = await aiCustomer360Api.buildContext({
          customerId,
          includeTimeline: true,
          includeGraph: true,
        });

        const insights = await aiCustomer360Api.generateInsights(context);
        
        if (isMounted) {
          setData(insights);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(err?.message || "Failed to fetch AI insights"));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchInsights();

    return () => {
      isMounted = false;
    };
  }, [customerId]);

  return {
    insights: data?.insights || [],
    metadata: data?.metadata,
    loading,
    error,
  };
}
