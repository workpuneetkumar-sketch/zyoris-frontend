import React, { useState } from "react";
import classNames from "classnames";
import { Lock, Eye, EyeOff } from "lucide-react";

interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Inline validation / server error message. When set the border turns red. */
  error?: string;
}

export default function PasswordField({ label, className, error, id, ...props }: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  const fieldId = id ?? `password-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const errorId = `${fieldId}-error`;

  return (
    <div className={classNames("w-full flex flex-col gap-1.5", className)}>
      <label htmlFor={fieldId} className="text-sm font-semibold text-gray-800">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <Lock className="w-5 h-5" />
        </div>
        <input
          id={fieldId}
          type={showPassword ? "text" : "password"}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : undefined}
          className={classNames(
            "w-full bg-white border rounded-xl py-3 pl-10 pr-12 outline-none transition-all placeholder-gray-400",
            "focus:ring-1",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-200"
              : "border-gray-200 focus:border-[#002B7F] focus:ring-[#002B7F]"
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002B7F] rounded"
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-500 mt-0.5">
          {error}
        </p>
      )}
    </div>
  );
}
