"use client";

import React from "react";
import { Wifi, WifiOff, ToggleLeft, ToggleRight } from "lucide-react";

interface DemoDataToggleProps {
  isDemo: boolean;
  onToggle: () => void;
  loading?: boolean;
}

export default function DemoDataToggle({ isDemo, onToggle, loading }: DemoDataToggleProps) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className={`
        group relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold
        transition-all duration-300 ease-out border
        ${isDemo
          ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 text-amber-700 hover:from-amber-100 hover:to-orange-100 hover:border-amber-300 shadow-sm shadow-amber-100"
          : "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 text-emerald-700 hover:from-emerald-100 hover:to-green-100 hover:border-emerald-300 shadow-sm shadow-emerald-100"
        }
        disabled:opacity-60 disabled:cursor-not-allowed
      `}
    >
      {/* Status Dot */}
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isDemo ? "bg-amber-400" : "bg-emerald-400"
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
            isDemo ? "bg-amber-500" : "bg-emerald-500"
          }`}
        />
      </span>

      {/* Icon */}
      {isDemo ? (
        <WifiOff size={16} className="text-amber-500" />
      ) : (
        <Wifi size={16} className="text-emerald-500" />
      )}

      {/* Label */}
      <span className="hidden sm:inline">
        {loading
          ? "Switching..."
          : isDemo
          ? "Using Demo Data"
          : "Using Real API"
        }
      </span>

      {/* Toggle Icon */}
      {isDemo ? (
        <ToggleLeft size={22} className="text-amber-400 group-hover:text-amber-600 transition-colors" />
      ) : (
        <ToggleRight size={22} className="text-emerald-400 group-hover:text-emerald-600 transition-colors" />
      )}

      {/* Tooltip */}
      <span className={`
        absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium
        px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10
        ${isDemo
          ? "bg-amber-700 text-white"
          : "bg-emerald-700 text-white"
        }
      `}>
        {isDemo ? "Click to use Real API" : "Click to use Demo Data"}
      </span>
    </button>
  );
}
