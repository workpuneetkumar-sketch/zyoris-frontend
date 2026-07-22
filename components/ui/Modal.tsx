"use client";

import { X } from "lucide-react";
import classNames from "classnames";
import { useEffect, useCallback } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  loading,
  className,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        className={classNames(
          "relative bg-surface rounded-2xl shadow-2xl border border-border max-w-lg w-full mx-4 overflow-hidden",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        aria-describedby={description ? "modal-description" : undefined}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between p-4 border-b border-border">
            <div className="flex-1">
              {title && (
                <h3 id="modal-title" className="text-lg font-semibold text-text">
                  {title}
                </h3>
              )}
              {description && (
                <p id="modal-description" className="mt-1 text-sm text-text-secondary">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-surface-hover transition-colors text-text-muted"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Body */}
        {children && (
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              children
            )}
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-background-secondary/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
