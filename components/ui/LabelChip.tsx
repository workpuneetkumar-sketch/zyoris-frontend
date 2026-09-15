import React from 'react';
import { X } from 'lucide-react';

export interface LabelChipProps {
  label: string;
  /** Background color tailwind class (e.g. bg-blue-100) */
  bgColorClass?: string;
  /** Text color tailwind class (e.g. text-blue-700) */
  textColorClass?: string;
  onRemove?: () => void;
  className?: string;
}

export function LabelChip({
  label,
  bgColorClass = 'bg-gray-100',
  textColorClass = 'text-gray-700',
  onRemove,
  className = '',
}: LabelChipProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColorClass} ${textColorClass} ${className}`}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={`ml-1.5 inline-flex items-center justify-center rounded-full w-4 h-4 hover:bg-black/10 focus:outline-none transition-colors ${textColorClass}`}
          aria-label={`Remove ${label}`}
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
}
