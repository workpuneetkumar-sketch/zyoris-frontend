"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { callbackOAuthApi } from "@/lib/api/integrationsApi";
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function IntegrationOAuthGenericCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const provider = searchParams?.get("provider") || "oauth";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!searchParams) return;
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error || errorDescription) {
      setStatus("error");
      setErrorMessage(
        errorDescription || error || "Authorization was denied by the provider."
      );
      toast.error(errorDescription || "OAuth authorization failed.");
      return;
    }

    const queryParams: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      queryParams[key] = val;
    });

    callbackOAuthApi(provider, queryParams)
      .then(() => {
        setStatus("success");
        toast.success(`Successfully authenticated with ${provider}!`);
        setTimeout(() => {
          router.replace("/integrations");
        }, 2000);
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
                Finalizing OAuth handshake...
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
                Redirecting you back to Integration Marketplace...
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
