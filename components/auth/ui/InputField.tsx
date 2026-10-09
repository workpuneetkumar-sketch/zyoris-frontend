import React from "react";
import classNames from "classnames";
import { LucideIcon } from "lucide-react";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  /** Inline validation / server error message. When set the border turns red. */
  error?: string;
}

export default function InputField({ label, icon: Icon, className, error, id, ...props }: InputFieldProps) {
  // Build a stable id for aria wiring. Callers can pass their own.
  const fieldId = id ?? `input-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const errorId = `${fieldId}-error`;

  return (
    <div className={classNames("w-full flex flex-col gap-1.5", className)}>
      <label htmlFor={fieldId} className="text-sm font-semibold text-gray-800">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <input
          id={fieldId}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : undefined}
          className={classNames(
            "w-full bg-white border rounded-xl py-3 px-4 outline-none transition-all placeholder-gray-400",
            "focus:ring-1",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-200"
              : "border-gray-200 focus:border-[#002B7F] focus:ring-[#002B7F]",
            Icon ? "pl-10" : ""
          )}
          {...props}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-500 mt-0.5">
          {error}
        </p>
      )}
    </div>
  );
}
