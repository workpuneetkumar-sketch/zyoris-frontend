"use client";

/**
 * PanelErrorBoundary
 *
 * A lightweight React error boundary for FE2 slide-over panels and modals.
 * Wraps each panel so a render-time crash stays contained inside that panel
 * and cannot propagate up to the global app error boundary.
 *
 * Usage:
 *   <PanelErrorBoundary label="Analytics">
 *     <PageAnalyticsPanel ... />
 *   </PanelErrorBoundary>
 */

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  /** Human-readable panel name shown in the fallback UI */
  label?: string;
  /** Called when the user clicks "Close" in the fallback */
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  message: string;
}

export class PanelErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message ?? "An unexpected error occurred.",
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console so it's visible in DevTools without crashing the app
    console.error(`[PanelErrorBoundary] ${this.props.label ?? "Panel"} crashed:`, error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { label = "Panel", onClose } = this.props;

    // Render a self-contained error fallback using createPortal so it
    // stays at the same z-index layer as the panel it replaced.
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
        {/* Fallback panel */}
        <div
          role="alertdialog"
          aria-label={`${label} error`}
          className="fixed right-0 top-0 h-full z-[9999] w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col items-center justify-center px-6 space-y-4 animate-in slide-in-from-right duration-200"
        >
          <AlertCircle className="w-10 h-10 text-red-400" />
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {label} failed to load
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {this.state.message}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </>
    );
  }
}
