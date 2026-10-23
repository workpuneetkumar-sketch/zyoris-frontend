"use client";

import React, { useState, useRef, useEffect } from "react";
import { Compass, Sparkles, Play, BookOpen, ChevronDown, CheckCircle2 } from "lucide-react";
import { useTour } from "@/context/TourContext";
import { TOUR_TRACKS } from "@/constants/tourData";
import { renderTourIcon } from "./tourIcons";

export function TourHeaderButton() {
  const { openGuideCenter, startTour } = useTour();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <div className="relative inline-block" ref={dropdownRef} data-tour="tour-guide-btn">
      <div className="flex items-center">
        {/* Main button: Click to open Guide Center */}
        <button
          type="button"
          onClick={() => openGuideCenter()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-l-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all select-none group shadow-2xs"
          title="Explore platform tour and features"
        >
          <Compass
            size={16}
            className="text-indigo-600 dark:text-indigo-400 group-hover:rotate-45 transition-transform duration-300"
          />
          <span className="hidden sm:inline">Tour Guide</span>
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-600 dark:bg-indigo-400"></span>
          </span>
        </button>

        {/* Dropdown trigger button */}
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className="px-1.5 py-1.5 rounded-r-xl text-xs bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-y border-r border-indigo-200 dark:border-indigo-800 transition-colors"
          aria-label="Tour options"
        >
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${
              dropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Dropdown menu */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#131929] border border-slate-300 dark:border-slate-700 shadow-2xl p-2.5 z-[9995] text-slate-900 dark:text-white">
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700/80">
            <p className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles size={13} className="text-indigo-600 dark:text-indigo-400" />
              Platform Feature Tours
            </p>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
              Select an interactive guided walkthrough:
            </p>
          </div>

          <div className="py-1.5 space-y-1">
            {TOUR_TRACKS.slice(0, 4).map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  startTour(track.id, 0);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors group text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    {renderTourIcon(track.iconName, "text-indigo-600 dark:text-indigo-400", 13)}
                  </div>
                  <span className="truncate">{track.title}</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold shrink-0 ml-2">
                  {track.duration}
                </span>
              </button>
            ))}
          </div>

          <div className="pt-2 mt-1 border-t border-slate-200 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                openGuideCenter();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
            >
              <BookOpen size={13} />
              <span>Browse All 50+ Features</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
