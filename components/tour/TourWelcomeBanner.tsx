"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Play, X, Compass } from "lucide-react";
import { useTour } from "@/context/TourContext";

export function TourWelcomeBanner() {
  const {
    welcomeBannerVisible,
    dismissWelcomeBanner,
    startTour,
    openGuideCenter,
  } = useTour();

  if (!welcomeBannerVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[9980] w-[380px] max-w-[calc(100vw-32px)] rounded-2xl bg-white dark:bg-[#131929] border border-indigo-300 dark:border-indigo-700/80 p-4 shadow-2xl shadow-black/40 text-slate-900 dark:text-white"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
              <Sparkles size={20} />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Welcome to Zyoris! 👋
              </h4>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">
                Take a 3-minute interactive guided tour to explore all CRM, AI agents, and collaboration features.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissWelcomeBanner}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => startTour("quickstart", 0)}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25 flex items-center justify-center gap-1.5 transition-all"
          >
            <Play size={13} fill="currentColor" />
            Start Quick Tour
          </button>

          <button
            type="button"
            onClick={() => openGuideCenter()}
            className="py-2 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1 transition-colors"
          >
            <Compass size={14} />
            Browse Features
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
