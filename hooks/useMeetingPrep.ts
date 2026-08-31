import { useState, useCallback } from "react";
import { aiCustomer360Api, MeetingPrepResponse, MeetingMetadata } from "@/lib/api/aiCustomer360Api";

export function useMeetingPrep(customerId: string) {
  const [data, setData] = useState<MeetingPrepResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const generateMeetingPrep = useCallback(async (meetingMetadata: MeetingMetadata = {}) => {
    if (!customerId) return null;
    
    setLoading(true);
    setError(null);
    try {
      const response = await aiCustomer360Api.generateMeetingPrep({
        customerId,
        meetingMetadata,
      });
      setData(response);
      return response;
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(err?.message || "Failed to generate meeting prep");
      setError(errorObj);
      throw errorObj;
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  return {
    meetingPrepData: data,
    generateMeetingPrep,
    loading,
    error,
  };
}
