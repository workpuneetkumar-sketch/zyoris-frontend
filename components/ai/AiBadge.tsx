import React from 'react';
import { Sparkles } from 'lucide-react';

interface AiBadgeProps {
  label?: string;
  className?: string;
}

export const AiBadge: React.FC<AiBadgeProps> = ({ label = "Auto-Detected via WhatsApp AI", className = "" }) => {
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 text-purple-700 text-xs font-medium shadow-sm backdrop-blur-sm transition-all hover:shadow-md hover:border-purple-500/40 ${className}`}>
      <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
      {label}
    </div>
  );
};
