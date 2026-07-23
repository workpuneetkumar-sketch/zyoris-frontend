import React from "react";
import classNames from "classnames";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export default function PrimaryButton({ children, icon, className, ...props }: PrimaryButtonProps) {
  return (
    <button
      className={classNames(
        "w-full flex items-center justify-center gap-2 bg-[#002B7F] hover:bg-[#002266] text-white font-medium py-3 px-4 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#002B7F]",
        className
      )}
      {...props}
    >
      {children}
      {icon && <span>{icon}</span>}
    </button>
  );
}
