"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  silent?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ClientErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ClientErrorBoundary] Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  handleGoDashboard = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
  };

  handleResetAuth = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("zyoris-auth");
        localStorage.removeItem("zyoris-token");
        localStorage.removeItem("token");
        sessionStorage.clear();
      } catch {}
      window.location.href = "/login";
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.silent) {
        return null;
      }

      return (
        <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#090d16] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl text-center">
            <div className="w-12 h-12 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              !
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {this.props.fallbackTitle || "Something went wrong loading this view"}
            </h2>
            <p className="text-xs text-gray-600 dark:text-zinc-400 mb-6 leading-relaxed">
              {this.props.fallbackMessage ||
                "An unexpected rendering error occurred. You can reload the page or return to the main dashboard."}
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleGoDashboard}
                className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 text-xs font-medium rounded-xl transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={this.handleResetAuth}
                className="w-full py-1.5 px-3 text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300 text-[11px] font-medium transition-colors"
              >
                Clear Cache & Sign In Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
