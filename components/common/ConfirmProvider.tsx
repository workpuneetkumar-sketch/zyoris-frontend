"use client";

import {
  createContext,
  KeyboardEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CircleHelp, Trash2 } from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "primary";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

export interface PromptOptions {
  title: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
  validate?: (value: string) => string | boolean | null | undefined;
}

type DialogResult = boolean | string | null;
type DialogRequest = {
  id: number;
  kind: "confirm" | "prompt";
  options: ConfirmOptions | PromptOptions;
  resolve: (result: DialogResult) => void;
  settled: boolean;
};
type DialogDispatcher = (kind: DialogRequest["kind"], options: ConfirmOptions | PromptOptions) => Promise<DialogResult>;

const DialogContext = createContext<DialogDispatcher | null>(null);
let mountedDispatcher: DialogDispatcher | null = null;
let nextRequestId = 0;

function getMountedDispatcher(): DialogDispatcher {
  if (!mountedDispatcher) {
    throw new Error("ConfirmProvider is not mounted. Mount it once near the app root before calling confirmDialog() or promptDialog().");
  }
  return mountedDispatcher;
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return getMountedDispatcher()("confirm", options) as Promise<boolean>;
}

export function promptDialog(options: PromptOptions): Promise<string | null> {
  return getMountedDispatcher()("prompt", options) as Promise<string | null>;
}

export function useConfirm() {
  const dispatch = useContext(DialogContext);
  if (!dispatch) throw new Error("useConfirm must be used within ConfirmProvider.");
  return useCallback((options: ConfirmOptions) => dispatch("confirm", options) as Promise<boolean>, [dispatch]);
}

export function usePrompt() {
  const dispatch = useContext(DialogContext);
  if (!dispatch) throw new Error("usePrompt must be used within ConfirmProvider.");
  return useCallback((options: PromptOptions) => dispatch("prompt", options) as Promise<string | null>, [dispatch]);
}

function resolveCancelled(request: DialogRequest) {
  if (request.settled) return;
  request.settled = true;
  request.resolve(request.kind === "confirm" ? false : null);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [activeRequest, setActiveRequest] = useState<DialogRequest | null>(null);
  const activeRef = useRef<DialogRequest | null>(null);
  const queueRef = useRef<DialogRequest[]>([]);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const bodyOverflowRef = useRef<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const promptInputRef = useRef<HTMLInputElement | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);
  const isDialogOpen = activeRequest !== null;
  const activeRequestId = activeRequest?.id;

  const dispatch = useCallback<DialogDispatcher>((kind, options) => new Promise((resolve) => {
    const request: DialogRequest = {
      id: ++nextRequestId,
      kind,
      options,
      resolve,
      settled: false,
    };

    if (!activeRef.current) {
      restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      activeRef.current = request;
      setActiveRequest(request);
    } else {
      queueRef.current.push(request);
    }
  }), []);

  const finish = useCallback((result: DialogResult) => {
    const current = activeRef.current;
    if (!current) return;
    if (!current.settled) {
      current.settled = true;
      current.resolve(result);
    }

    const next = queueRef.current.shift() || null;
    activeRef.current = next;
    setActiveRequest(next);
    if (!next) {
      const previouslyFocused = restoreFocusRef.current;
      restoreFocusRef.current = null;
      window.setTimeout(() => previouslyFocused?.focus(), 0);
    }
  }, []);

  useEffect(() => {
    mountedDispatcher = dispatch;
    return () => {
      if (mountedDispatcher === dispatch) mountedDispatcher = null;
      if (activeRef.current) resolveCancelled(activeRef.current);
      queueRef.current.forEach(resolveCancelled);
      activeRef.current = null;
      queueRef.current = [];
      const previouslyFocused = restoreFocusRef.current;
      restoreFocusRef.current = null;
      previouslyFocused?.focus();
    };
  }, [dispatch]);

  useLayoutEffect(() => {
    if (!isDialogOpen) return;
    bodyOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      if (bodyOverflowRef.current !== null) {
        document.body.style.overflow = bodyOverflowRef.current;
        bodyOverflowRef.current = null;
      }
    };
  }, [isDialogOpen]);

  useEffect(() => {
    if (!isDialogOpen) return;
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      finish(activeRef.current?.kind === "confirm" ? false : null);
    };
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [finish, isDialogOpen]);

  useEffect(() => {
    if (activeRequestId === undefined) return;
    setPromptError(null);
    const currentRequest = activeRef.current;
    setPromptValue(currentRequest?.kind === "prompt" ? (currentRequest.options as PromptOptions).defaultValue || "" : "");
    if (currentRequest?.kind === "prompt") promptInputRef.current?.focus();
    else confirmButtonRef.current?.focus();
  }, [activeRequestId]);

  const handlePromptConfirm = useCallback(() => {
    if (!activeRequest || activeRequest.kind !== "prompt") return;
    const validate = (activeRequest.options as PromptOptions).validate;
    const validation = validate?.(promptValue);
    if (typeof validation === "string" && validation) {
      setPromptError(validation);
      return;
    }
    if (validation === false) {
      setPromptError("Please enter a valid value.");
      return;
    }
    finish(promptValue);
  }, [activeRequest, finish, promptValue]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      finish(activeRequest?.kind === "confirm" ? false : null);
      return;
    }

    if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement) && !(event.target instanceof HTMLTextAreaElement)) {
      event.preventDefault();
      event.stopPropagation();
      if (activeRequest?.kind === "prompt") handlePromptConfirm();
      else finish(true);
      return;
    }

    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const options = activeRequest?.options;
  const variant = activeRequest?.kind === "confirm" ? (options as ConfirmOptions).variant || "primary" : "primary";
  const variantStyles = {
    danger: { circle: "bg-red-50 text-red-600", button: "bg-red-600 hover:bg-red-700", Icon: Trash2 },
    warning: { circle: "bg-amber-50 text-amber-600", button: "bg-amber-500 hover:bg-amber-600", Icon: AlertTriangle },
    primary: { circle: "bg-blue-50 text-blue-600", button: "bg-blue-600 hover:bg-blue-700", Icon: CircleHelp },
  }[variant];
  const Icon = variantStyles.Icon;

  return (
    <DialogContext.Provider value={dispatch}>
      {children}
      {activeRequest && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) finish(activeRequest.kind === "confirm" ? false : null);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            data-confirm-dialog
            aria-labelledby={`confirm-title-${activeRequest.id}`}
            aria-describedby={`confirm-message-${activeRequest.id}`}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${variantStyles.circle}`}>
              <Icon size={22} aria-hidden="true" />
            </div>
            <h2 id={`confirm-title-${activeRequest.id}`} className="text-center text-lg font-semibold text-gray-900">
              {options?.title}
            </h2>
            <p id={`confirm-message-${activeRequest.id}`} className="mt-2 text-center text-sm text-gray-600">
              {options?.message}
            </p>
            {activeRequest.kind === "prompt" && (
              <div className="mt-4">
                <input
                  ref={promptInputRef}
                  autoComplete="off"
                  value={promptValue}
                  placeholder={(options as PromptOptions).placeholder}
                  aria-label={(options as PromptOptions).placeholder || (options as PromptOptions).message}
                  onChange={(event) => {
                    setPromptValue(event.target.value);
                    setPromptError(null);
                  }}
                  aria-invalid={Boolean(promptError)}
                  aria-describedby={promptError ? `confirm-error-${activeRequest.id}` : `confirm-message-${activeRequest.id}`}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                {promptError && (
                  <p id={`confirm-error-${activeRequest.id}`} className="mt-1 text-xs text-red-600">{promptError}</p>
                )}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => finish(activeRequest.kind === "confirm" ? false : null)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                {activeRequest.kind === "confirm" ? (options as ConfirmOptions).cancelText || "Cancel" : "Cancel"}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => activeRequest.kind === "prompt" ? handlePromptConfirm() : finish(true)}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${variantStyles.button}`}
              >
                {activeRequest.kind === "confirm" ? (options as ConfirmOptions).confirmText || "Confirm" : (options as PromptOptions).confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </DialogContext.Provider>
  );
}
