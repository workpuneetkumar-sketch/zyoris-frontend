import React from "react";
import classNames from "classnames";
import { LucideIcon } from "lucide-react";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
}

export default function InputField({ label, icon: Icon, className, ...props }: InputFieldProps) {
  return (
    <div className={classNames("w-full flex flex-col gap-1.5", className)}>
      <label className="text-sm font-semibold text-gray-800">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <input
          className={classNames(
            "w-full bg-white border border-gray-200 rounded-xl py-3 px-4 outline-none transition-all focus:border-[#002B7F] focus:ring-1 focus:ring-[#002B7F] placeholder-gray-400",
            Icon ? "pl-10" : ""
          )}
          {...props}
        />
      </div>
    </div>
  );
}
