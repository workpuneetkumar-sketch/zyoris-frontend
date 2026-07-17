"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class PaymentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[PaymentErrorBoundary] ${this.props.pageName || "Payment Page"} Error:`, error);
    console.error("[PaymentErrorBoundary] Component Stack:", errorInfo.componentStack);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-lg">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertCircle size={28} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {this.props.pageName ? `${this.props.pageName} Error` : "Something went wrong"}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            {this.state.errorInfo && (
              <details className="mb-6 text-left">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 mb-2">
                  Show error details
                </summary>
                <pre className="text-[10px] text-red-600 bg-red-50 p-3 rounded-lg overflow-x-auto max-h-40">
                  {this.state.error?.stack}
                  {"\n\n"}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm"
            >
              <RefreshCw size={14} /> Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
