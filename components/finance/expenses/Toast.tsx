"use client";

import { useEffect } from "react";
import {
  SuccessStatusIcon,
  ErrorStatusIcon,
  MinimalCloseIcon,
} from "@/components/ui/Toast";

interface ToastProps {
  message: string;
  type: "success" | "error";
  isVisible: boolean;
  onClose: () => void;
  title?: string;
}

export default function Toast({
  message,
  type,
  isVisible,
  onClose,
  title,
}: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const isSuccess = type === "success";

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div
        className={`w-full sm:w-[420px] max-w-[420px] flex items-start gap-3.5 p-4 rounded-2xl border shadow-[0_4px_16px_-2px_rgba(0,0,0,0.05),_0_2px_6px_-1px_rgba(0,0,0,0.03)] font-sans text-left transition-all ${
          isSuccess
            ? "bg-[#EDFAF3] border-[#7FE2BA]"
            : "bg-[#FDF2F1] border-[#F8B4AF]"
        }`}
        role="alert"
      >
        {isSuccess ? <SuccessStatusIcon /> : <ErrorStatusIcon />}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h4 className="text-[15px] font-semibold text-[#1E293B] leading-snug">
            {title || (isSuccess ? "Success" : "Error Occurred")}
          </h4>
          <p className="text-[13px] font-normal text-[#475569] leading-relaxed mt-0.5 whitespace-pre-line">
            {message}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          className="shrink-0 ml-auto p-1 text-[#94A3B8] hover:text-[#475569] hover:bg-black/5 rounded-md transition-colors border-0 bg-transparent cursor-pointer self-start"
        >
          <MinimalCloseIcon />
        </button>
      </div>
    </div>
  );
}
