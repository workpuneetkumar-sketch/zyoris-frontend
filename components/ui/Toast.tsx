"use client";

import React from "react";
import { Toaster, toast as sonnerToast } from "sonner";
import classNames from "classnames";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  type?: ToastType;
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
  onAutoClose?: () => void;
  id?: string | number;
}

// ── Figma Exact Status Icons (Squircle with smooth gradients & white glyphs) ──

export function SuccessStatusIcon({ className }: { className?: string }) {
  return (
    <div
      className={classNames(
        "w-[38px] h-[38px] min-w-[38px] min-h-[38px] rounded-[11px] flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(40,184,158,0.22)]",
        className
      )}
      style={{
        background: "linear-gradient(135deg, #3CD29A 0%, #28B89E 100%)",
      }}
      aria-hidden="true"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

export function InfoStatusIcon({ className }: { className?: string }) {
  return (
    <div
      className={classNames(
        "w-[38px] h-[38px] min-w-[38px] min-h-[38px] rounded-[11px] flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(30,142,247,0.22)]",
        className
      )}
      style={{
        background: "linear-gradient(135deg, #4BB6FC 0%, #1E8EF7 100%)",
      }}
      aria-hidden="true"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF">
        <circle cx="12" cy="7" r="2.1" />
        <rect x="10.2" y="11.2" width="3.6" height="7.8" rx="1.8" />
      </svg>
    </div>
  );
}

export function WarningStatusIcon({ className }: { className?: string }) {
  return (
    <div
      className={classNames(
        "w-[38px] h-[38px] min-w-[38px] min-h-[38px] rounded-[11px] flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(255,140,0,0.22)]",
        className
      )}
      style={{
        background: "linear-gradient(135deg, #FFBA38 0%, #FF8C00 100%)",
      }}
      aria-hidden="true"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF">
        <rect x="10.5" y="5" width="3" height="9.5" rx="1.5" />
        <circle cx="12" cy="18.5" r="1.8" />
      </svg>
    </div>
  );
}

export function ErrorStatusIcon({ className }: { className?: string }) {
  return (
    <div
      className={classNames(
        "w-[38px] h-[38px] min-w-[38px] min-h-[38px] rounded-[11px] flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(217,67,59,0.22)]",
        className
      )}
      style={{
        background: "linear-gradient(135deg, #F26C64 0%, #D9433B 100%)",
      }}
      aria-hidden="true"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </div>
  );
}

export function MinimalCloseIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Standalone Notification Toast Card (for inline renders and custom uses) ──

export interface NotificationToastCardProps {
  type: ToastType;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  onClose?: () => void;
  className?: string;
}

export function NotificationToastCard({
  type,
  title,
  description,
  action,
  onClose,
  className,
}: NotificationToastCardProps) {
  const variantStyles = {
    success: {
      bg: "bg-[#EDFAF3]",
      border: "border-[#7FE2BA]",
      icon: <SuccessStatusIcon />,
    },
    info: {
      bg: "bg-[#EEF6FF]",
      border: "border-[#99CCF9]",
      icon: <InfoStatusIcon />,
    },
    warning: {
      bg: "bg-[#FFF9EE]",
      border: "border-[#FCD38D]",
      icon: <WarningStatusIcon />,
    },
    error: {
      bg: "bg-[#FDF2F1]",
      border: "border-[#F8B4AF]",
      icon: <ErrorStatusIcon />,
    },
  }[type];

  return (
    <div
      className={classNames(
        "w-full sm:w-[420px] max-w-[420px] flex items-start gap-3.5 p-4 rounded-2xl border shadow-[0_4px_16px_-2px_rgba(0,0,0,0.05),_0_2px_6px_-1px_rgba(0,0,0,0.03)] transition-all font-sans text-left",
        variantStyles.bg,
        variantStyles.border,
        className
      )}
      role="alert"
    >
      {variantStyles.icon}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h4 className="text-[15px] font-semibold text-[#1E293B] leading-snug">
          {title}
        </h4>
        {description && (
          <p className="text-[13px] font-normal text-[#475569] leading-relaxed mt-0.5 whitespace-pre-line">
            {description}
          </p>
        )}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="shrink-0 ml-2 px-3.5 py-1.5 rounded-lg border border-[#94A3B8] bg-white text-[13px] font-medium text-[#334155] hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer self-center"
        >
          {action.label}
        </button>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          className="shrink-0 ml-auto p-1 text-[#94A3B8] hover:text-[#475569] hover:bg-black/5 rounded-md transition-colors border-0 bg-transparent cursor-pointer self-start"
        >
          <MinimalCloseIcon />
        </button>
      )}
    </div>
  );
}

// ── Toast API ───────────────────────────────────────────────────────────────

export function toast(message: string, options: ToastOptions = {}) {
  const {
    type = "info",
    description,
    duration = 5000,
    action,
    onDismiss,
    onAutoClose,
    id,
  } = options;

  return sonnerToast[type](message, {
    id,
    description,
    duration,
    action: action
      ? {
          label: action.label,
          onClick: () => {
            action.onClick();
          },
        }
      : undefined,
    onDismiss,
    onAutoClose,
  });
}

toast.success = (message: string, options?: Omit<ToastOptions, "type">) =>
  toast(message, { ...options, type: "success" });

toast.error = (message: string, options?: Omit<ToastOptions, "type">) =>
  toast(message, { ...options, type: "error" });

toast.warning = (message: string, options?: Omit<ToastOptions, "type">) =>
  toast(message, { ...options, type: "warning" });

toast.info = (message: string, options?: Omit<ToastOptions, "type">) =>
  toast(message, { ...options, type: "info" });

toast.dismiss = (id?: number | string) => sonnerToast.dismiss(id);

// ── Global Toast Provider ───────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        theme="light"
        expand={true}
        gap={12}
        visibleToasts={6}
        closeButton={true}
        icons={{
          success: <SuccessStatusIcon />,
          info: <InfoStatusIcon />,
          warning: <WarningStatusIcon />,
          error: <ErrorStatusIcon />,
          close: <MinimalCloseIcon />,
        }}
        toastOptions={{
          duration: 5000,
          classNames: {
            toast:
              "w-full sm:w-[420px] max-w-[420px] flex items-start gap-3.5 p-4 rounded-2xl shadow-[0_4px_16px_-2px_rgba(0,0,0,0.05),_0_2px_6px_-1px_rgba(0,0,0,0.03)] border font-sans text-left transition-all",
            title: "text-[15px] font-semibold text-[#1E293B] leading-snug",
            description:
              "text-[13px] font-normal text-[#475569] leading-relaxed mt-0.5 whitespace-pre-line",
            actionButton:
              "!bg-white !text-[#334155] !border !border-[#94A3B8] !rounded-lg !px-3.5 !py-1.5 !text-[13px] !font-medium hover:!bg-slate-50 hover:!border-slate-400 !shadow-none !cursor-pointer !shrink-0 !ml-2 transition-colors",
            closeButton:
              "!static !transform-none !top-auto !right-auto !left-auto !bottom-auto !p-1 !text-[#94A3B8] hover:!text-[#475569] hover:!bg-black/5 !rounded-md transition-colors !border-0 !bg-transparent !shrink-0 !ml-auto !cursor-pointer",
            success: "!bg-[#EDFAF3] !border-[#7FE2BA] !text-[#1E293B]",
            info: "!bg-[#EEF6FF] !border-[#99CCF9] !text-[#1E293B]",
            warning: "!bg-[#FFF9EE] !border-[#FCD38D] !text-[#1E293B]",
            error: "!bg-[#FDF2F1] !border-[#F8B4AF] !text-[#1E293B]",
          },
        }}
      />
    </>
  );
}
