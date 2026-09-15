import React from "react";
import classNames from "classnames";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: () => void;
}

export default function BackButton({ onClick, className, ...props }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      className={classNames(
        "flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors focus:outline-none",
        className
      )}
      {...props}
    >
      <ArrowLeft className="w-4 h-4 mr-1.5" />
      Back
    </button>
  );
}
