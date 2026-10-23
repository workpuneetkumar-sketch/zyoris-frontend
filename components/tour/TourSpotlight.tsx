"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Lightbulb,
  Compass,
  ArrowRight,
  Check,
} from "lucide-react";
import { useTour } from "@/context/TourContext";
import { renderTourIcon } from "./tourIcons";
import { getFeatureById } from "@/constants/tourData";

export function TourSpotlight() {
  const {
    isOpen,
    currentStep,
    currentStepIndex,
    totalSteps,
    currentTrack,
    nextStep,
    prevStep,
    stopTour,
    goToStep,
  } = useTour();

  const pathname = usePathname();
  const router = useRouter();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [popoverPos, setPopoverPos] = useState<{
    top: number;
    left: number;
    placement: "right" | "left" | "bottom" | "top" | "center";
  }>({
    top: 40,
    left: 40,
    placement: "center",
  });

  const cardRef = useRef<HTMLDivElement>(null);

  // Locate target element and compute bounding rect with strict viewport safety
  const updatePosition = useCallback(() => {
    if (!isOpen || !currentStep) {
      setTargetRect(null);
      return;
    }

    const padding = 16;
    const screenW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const screenH = typeof window !== "undefined" ? window.innerHeight : 800;

    // Use measured card height if rendered, or a safe conservative estimate of 560px
    const measuredHeight = cardRef.current
      ? Math.max(
          cardRef.current.scrollHeight,
          cardRef.current.offsetHeight,
          cardRef.current.getBoundingClientRect().height
        )
      : 0;

    const actualCardHeight = Math.min(
      Math.max(measuredHeight, 560),
      screenH - padding * 2
    );
    const actualCardWidth = Math.min(460, screenW - padding * 2);

    // If no targetSelector specified, center the card on screen
    if (!currentStep.targetSelector) {
      setTargetRect(null);
      const top = Math.max(padding, Math.round((screenH - actualCardHeight) / 2));
      const left = Math.max(padding, Math.round((screenW - actualCardWidth) / 2));
      setPopoverPos({ top, left, placement: "center" });
      return;
    }

    const el = document.querySelector(currentStep.targetSelector);
    if (!el) {
      setTargetRect(null);
      const top = Math.max(padding, Math.round((screenH - actualCardHeight) / 2));
      const left = Math.max(padding, Math.round((screenW - actualCardWidth) / 2));
      setPopoverPos({ top, left, placement: "center" });
      return;
    }

    // Scroll target into view smoothly
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });

    const rect = el.getBoundingClientRect();
    setTargetRect(rect);

    let left = 0;
    let top = 0;
    let placement: "right" | "left" | "bottom" | "top" | "center" = "right";

    const targetCenterY = rect.top + rect.height / 2;

    // Smart placement based on target position
    if (rect.left < 280) {
      // Element is in sidebar on the left -> place to the right
      placement = "right";
      left = rect.right + 16;
      if (left + actualCardWidth > screenW - padding) {
        left = Math.max(padding, (screenW - actualCardWidth) / 2);
      }
      // Position card vertically aligned with the target item
      top = targetCenterY - 100;
    } else if (rect.top < 110) {
      // Element is in top header (Search, Notifications, Tour button) -> place below
      placement = "bottom";
      left = rect.left + rect.width / 2 - actualCardWidth / 2;
      top = rect.bottom + 12;
    } else if (rect.bottom > screenH - 120 && rect.right > screenW - 200) {
      // Element is in bottom right (ZiiBot) -> place top-left
      placement = "top";
      left = rect.left - actualCardWidth - 14;
      top = rect.top - actualCardHeight - 14;
    } else {
      // General positioning
      if (rect.right + actualCardWidth + 24 < screenW) {
        placement = "right";
        left = rect.right + 14;
        top = targetCenterY - 100;
      } else if (rect.left - actualCardWidth - 24 > 0) {
        placement = "left";
        left = rect.left - actualCardWidth - 14;
        top = targetCenterY - 100;
      } else if (screenH - rect.bottom >= actualCardHeight + 20) {
        placement = "bottom";
        left = rect.left + rect.width / 2 - actualCardWidth / 2;
        top = rect.bottom + 14;
      } else if (rect.top >= actualCardHeight + 20) {
        placement = "top";
        left = rect.left + rect.width / 2 - actualCardWidth / 2;
        top = rect.top - actualCardHeight - 14;
      } else {
        placement = "center";
        left = (screenW - actualCardWidth) / 2;
        top = (screenH - actualCardHeight) / 2;
      }
    }

    // ── STRICT ABSOLUTE VIEWPORT BOUNDARY CLAMPING ──
    // Guarantees the card and all its action buttons can NEVER overflow the screen
    const maxTop = Math.max(padding, screenH - actualCardHeight - padding);
    top = Math.max(padding, Math.min(top, maxTop));

    const maxLeft = Math.max(padding, screenW - actualCardWidth - padding);
    left = Math.max(padding, Math.min(left, maxLeft));

    setPopoverPos({ top, left, placement });
  }, [isOpen, currentStep]);

  // Window resize, scroll, and card resize listeners
  useEffect(() => {
    updatePosition();
    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    let resizeObserver: ResizeObserver | null = null;
    if (cardRef.current && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updatePosition();
      });
      resizeObserver.observe(cardRef.current);
    }

    const t1 = setTimeout(updatePosition, 50);
    const t2 = setTimeout(updatePosition, 180);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
      resizeObserver?.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [updatePosition, currentStepIndex]);

  // Keyboard navigation support: Esc to exit, Arrows to navigate
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopTour();
      } else if (e.key === "ArrowRight") {
        nextStep();
      } else if (e.key === "ArrowLeft") {
        prevStep();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, nextStep, prevStep, stopTour]);

  if (!isOpen || !currentStep) return null;

  const isLastStep = currentStepIndex === totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;
  const feature = getFeatureById(currentStep.id);
  const iconName = feature?.iconName ?? "Compass";
  const isOnFeatureRoute = currentStep.route && pathname === currentStep.route;

  const handleNavigateToPage = () => {
    if (currentStep.route) {
      router.push(currentStep.route);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none select-none">
      {/* ── Semi-transparent Backdrop ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={stopTour}
        className="absolute inset-0 bg-black/60 pointer-events-auto backdrop-blur-[2px]"
      />

      {/* ── Spotlight Cutout & Glowing Halo around Target ── */}
      {targetRect && (
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
          className="fixed rounded-xl pointer-events-none border-2 border-indigo-400 dark:border-indigo-400 bg-white/5 dark:bg-white/10 shadow-[0_0_25px_rgba(99,102,241,0.65),inset_0_0_12px_rgba(99,102,241,0.25)] transition-all duration-300 z-[10000]"
        >
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
          </span>
        </motion.div>
      )}

      {/* ── Floating Tour Popover Card ── */}
      <div
        ref={cardRef}
        style={{
          top: `${popoverPos.top}px`,
          left: `${popoverPos.left}px`,
          maxHeight: `calc(100vh - ${popoverPos.top + 16}px)`,
        }}
        className="fixed pointer-events-auto z-[10001] w-[460px] max-w-[calc(100vw-32px)] flex flex-col rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#131929] shadow-2xl shadow-black/60 overflow-hidden text-slate-900 dark:text-white transition-[top,left] duration-150 ease-out"
      >
        {/* Top Track & Progress Header (Pinned) */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/90 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 truncate max-w-[210px]">
              <Sparkles size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="truncate">{currentTrack?.title || "Feature Tour"}</span>
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate hidden sm:inline">
              {currentStep.category}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-200/90 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600">
              {currentStepIndex + 1} / {totalSteps}
            </span>
            <button
              type="button"
              onClick={stopTour}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              title="Exit Tour (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Progress bar across width */}
        <div className="shrink-0 w-full bg-slate-200 dark:bg-slate-700 h-1.5">
          <div
            className="h-1.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 transition-all duration-300"
            style={{
              width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
            }}
          />
        </div>

        {/* Main Card Content (Scrollable internally with full overflow containment) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 md:p-5 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="space-y-3.5"
            >
              {/* Title & Icon Header */}
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-sm">
                  {renderTourIcon(iconName, "text-indigo-600 dark:text-indigo-400", 24)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                      {currentStep.title}
                    </h3>
                    {currentStep.badge && (
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
                        {currentStep.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[13.5px] font-semibold text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">
                    {currentStep.summary}
                  </p>
                </div>
              </div>

              {/* Deep-dive description */}
              <p className="text-[13px] font-normal text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/90 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                {currentStep.description}
              </p>

              {/* Capabilities list */}
              {currentStep.capabilities && currentStep.capabilities.length > 0 && (
                <div className="space-y-2 pt-0.5">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                    Key Capabilities
                  </p>
                  <ul className="space-y-2">
                    {currentStep.capabilities.map((cap, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-[13px] font-medium text-slate-800 dark:text-slate-100 leading-snug"
                      >
                        <CheckCircle2
                          size={16}
                          className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                        />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pro tip card */}
              {currentStep.proTips && currentStep.proTips.length > 0 && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-100">
                  <Lightbulb size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[13px] font-medium leading-relaxed">
                    <span className="font-extrabold text-amber-900 dark:text-amber-300">
                      Pro-tip:{" "}
                    </span>
                    {currentStep.proTips[0]}
                  </div>
                </div>
              )}

              {/* Direct Link to Page if applicable */}
              {currentStep.route && (
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={handleNavigateToPage}
                    className={`w-full flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      isOnFeatureRoute
                        ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700"
                        : "bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800"
                    }`}
                  >
                    {isOnFeatureRoute ? (
                      <>
                        <Check size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">Currently on this screen ({currentStep.route})</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink size={15} className="shrink-0" />
                        <span className="truncate">Open & explore {currentStep.title} ({currentStep.route})</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation & Controls (Pinned, Never overflows or shrinks) */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/90 gap-2">
          <button
            type="button"
            onClick={prevStep}
            disabled={isFirstStep}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              isFirstStep
                ? "opacity-35 cursor-not-allowed text-slate-400 dark:text-slate-600"
                : "bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 shadow-xs"
            }`}
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          {/* Step Dots indicator */}
          <div className="flex items-center gap-1.5 max-w-[120px] overflow-hidden shrink-0">
            {Array.from({ length: Math.min(totalSteps, 10) }).map((_, i) => {
              const isActive = i === currentStepIndex;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => goToStep(i)}
                  className={`h-2 rounded-full transition-all ${
                    isActive
                      ? "w-4 bg-indigo-600 dark:bg-indigo-400"
                      : "w-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
                  }`}
                  title={`Jump to step ${i + 1}`}
                />
              );
            })}
            {totalSteps > 10 && (
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pl-0.5">...</span>
            )}
          </div>

          <button
            type="button"
            onClick={nextStep}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <span>{isLastStep ? "Finish Tour" : "Next"}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
