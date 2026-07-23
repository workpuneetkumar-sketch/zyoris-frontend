import React from "react";
import classNames from "classnames";

interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export default function SecondaryButton({ children, icon, className, ...props }: SecondaryButtonProps) {
  return (
    <button
      className={classNames(
        "w-full flex items-center justify-center gap-2 bg-transparent text-[#002B7F] border border-[#002B7F] hover:bg-[#F0F5FF] font-medium py-3 px-4 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#002B7F]",
        className
      )}
      {...props}
    >
      {children}
      {icon && <span>{icon}</span>}
    </button>
  );
}
