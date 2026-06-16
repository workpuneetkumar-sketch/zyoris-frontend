"use client";

import { X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "danger";
  countdownSeconds?: number | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  countdownSeconds = null,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const confirmButtonClasses =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-gray-600">{message}</p>
          {countdownSeconds != null && (
            <p className="text-xs text-gray-400 mt-3 font-medium">
              Automatic logout in {countdownSeconds}s
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${confirmButtonClasses}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
