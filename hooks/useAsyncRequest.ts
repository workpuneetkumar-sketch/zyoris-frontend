"use client";

import { useCallback, useRef, useState } from "react";

export type AsyncRequestStatus = "idle" | "loading" | "success" | "failure";

export interface AsyncRequestState<T> {
  status: AsyncRequestStatus;
  data: T | null;
  error: Error | null;
  isRetrying: boolean;
}

export class AsyncRequestError<T> extends Error {
  constructor(public readonly data: T, message: string) {
    super(message);
    this.name = "AsyncRequestError";
  }
}

export function useAsyncRequest<T>() {
  const [state, setState] = useState<AsyncRequestState<T>>({
    status: "idle",
    data: null,
    error: null,
    isRetrying: false,
  });
  const requestIdRef = useRef(0);
  const lastRequestRef = useRef<(() => Promise<T>) | null>(null);

  const execute = useCallback(async (request: () => Promise<T>, retry = false) => {
    const requestId = ++requestIdRef.current;
    lastRequestRef.current = request;
    setState({
      status: "loading",
      data: null,
      error: null,
      isRetrying: retry,
    });

    try {
      const data = await request();
      if (requestId !== requestIdRef.current) return null;
      setState({ status: "success", data, error: null, isRetrying: false });
      return data;
    } catch (error) {
      if (requestId !== requestIdRef.current) return null;
      setState({
        status: "failure",
        data: null,
        error: error instanceof Error ? error : new Error("Request failed"),
        isRetrying: false,
      });
      throw error;
    }
  }, []);

  const retry = useCallback(async () => {
    if (!lastRequestRef.current) return null;
    return execute(lastRequestRef.current, true);
  }, [execute]);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    lastRequestRef.current = null;
    setState({ status: "idle", data: null, error: null, isRetrying: false });
  }, []);

  return { ...state, execute, retry, reset };
}