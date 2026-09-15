"use client";

import { Toaster, toast as sonnerToast } from "sonner";
import { useTheme } from "@/context/ThemeContext";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastOptions {
  type?: ToastType;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export function toast(message: string, options: ToastOptions = {}) {
  const { type = "info", duration, action } = options;
  return sonnerToast[type](message, {
    duration,
    action: action
      ? {
          label: action.label,
          onClick: action.onClick,
        }
      : undefined,
  });
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        theme={isDark ? "dark" : "light"}
        toastOptions={{
          duration: 4000,
        }}
      />
    </>
  );
}
