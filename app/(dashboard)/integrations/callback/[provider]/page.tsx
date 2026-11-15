"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { callbackOAuthApi } from "@/lib/api/integrationsApi";
import { Loader2, CheckCircle2, AlertCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type CallbackStatus = "loading" | "success" | "cancelled" | "error";

export default function IntegrationOAuthCallbackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const handledKeyRef = useRef<string | null>(null);

  const provider = (params?.provider as string) || "oauth";
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!searchParams) return;

    const rawKey = `${provider}:${searchParams.toString()}`;
    if (handledKeyRef.current === rawKey) return;
    handledKeyRef.current = rawKey;

    const scrubSensitiveParams = () => {
      if (typeof window !== "undefined" && window.history?.replaceState) {
        const cleanUrl = `${window.location.pathname}`;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    };

    const backendStatus = searchParams.get("status");
    const backendMessage = searchParams.get("message");

    // Case 1: Backend handled callback & performed a 302 redirect here
    if (backendStatus === "success") {
      setStatus("success");
      toast.success(`Successfully authenticated with ${provider}!`);
      scrubSensitiveParams();
      const timer = setTimeout(() => {
        router.replace("/integrations");
      }, 1800);
      return () => clearTimeout(timer);
    }

    if (backendStatus === "cancelled") {
      const msg = backendMessage || "Authorization was cancelled by the user.";
      setStatus("cancelled");
      setErrorMessage(msg);
      toast.info(msg);
      scrubSensitiveParams();
      return;
    }

    if (backendStatus === "error") {
      const msg = backendMessage || "OAuth authorization failed.";
      setStatus("error");
      setErrorMessage(msg);
      toast.error(msg);
      scrubSensitiveParams();
      return;
    }

    // Case 2: Direct SPA callback handling (?error=... or ?code=...&state=...)
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error || errorDescription) {
      const normalized = (error || "").toLowerCase();
      const isCancelled =
        normalized === "access_denied" ||
        normalized === "user_cancelled_login" ||
        normalized === "user_cancelled_authorize";

      if (isCancelled) {
        const msg = errorDescription || "Authorization was cancelled by the user.";
        setStatus("cancelled");
        setErrorMessage(msg);
        toast.info(msg);
      } else {
        const msg =
          errorDescription || error || "Authorization was denied by the provider.";
        setStatus("error");
        setErrorMessage(msg);
        toast.error(msg);
      }
      scrubSensitiveParams();
      return;
    }

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code || !state) {
      setStatus("error");
      setErrorMessage("Missing OAuth authorization code or state parameter.");
      scrubSensitiveParams();
      return;
    }

    const queryParams: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });
    scrubSensitiveParams();

    callbackOAuthApi(provider, queryParams)
      .then((res) => {
        if (res?.status === "cancelled") {
          setStatus("cancelled");
          setErrorMessage(res?.message || "Authorization was cancelled by the user.");
          toast.info(res?.message || "Authorization cancelled.");
          return;
        }
        setStatus("success");
        toast.success(`Successfully authenticated with ${provider}!`);
        setTimeout(() => {
          router.replace("/integrations");
        }, 1800);
      })
      .catch((err: any) => {
        setStatus("error");
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to complete OAuth callback.";
        setErrorMessage(msg);
        toast.error(msg);
      });
  }, [provider, searchParams, router]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-2xl border border-border bg-surface shadow-2xl text-center space-y-5">
        {status === "loading" && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">
                Completing Authorization
              </h2>
              <p className="text-xs text-text-muted mt-1">
                Finalizing OAuth handshake with {provider}...
              </p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center text-success mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">
                Connection Successful!
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Your integration with {provider} is now active. Redirecting you back to Marketplace...
              </p>
            </div>
            <Link
              href="/integrations"
              className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
            >
              <span>Click here if not redirected automatically</span>
            </Link>
          </div>
        )}

        {status === "cancelled" && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto">
              <XCircle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">
                Connection Cancelled
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                {errorMessage}
              </p>
            </div>
            <Link
              href="/integrations"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border text-text hover:bg-surface-hover text-xs font-semibold shadow-sm transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Marketplace</span>
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center text-error mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">
                Connection Failed
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                {errorMessage}
              </p>
            </div>
            <Link
              href="/integrations"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border text-text hover:bg-surface-hover text-xs font-semibold shadow-sm transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Marketplace</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
