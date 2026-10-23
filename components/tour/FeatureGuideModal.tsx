"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Sparkles,
  Compass,
  Play,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Lightbulb,
  Shield,
  Layers,
  Clock,
  Sliders,
  Filter,
} from "lucide-react";
import { useTour } from "@/context/TourContext";
import {
  ALL_TOUR_FEATURES,
  TOUR_TRACKS,
  getTrackById,
} from "@/constants/tourData";
import { TourCategory, TourFeatureItem } from "@/types/tour";
import { renderTourIcon } from "./tourIcons";

const CATEGORIES: TourCategory[] = [
  "All",
  "Executive Dashboards",
  "CRM Ecosystem",
  "Communication & Collab",
  "Business Operations",
  "Platform Intelligence",
  "Admin & Agentic AI",
  "Core Utilities",
];

export function FeatureGuideModal() {
  const {
    isGuideCenterOpen,
    closeGuideCenter,
    startTour,
    startSingleFeatureSpotlight,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
  } = useTour();

  const router = useRouter();
  const [selectedFeature, setSelectedFeature] = useState<TourFeatureItem | null>(null);

  // Filter features based on search query and category
  const filteredFeatures = useMemo(() => {
    return ALL_TOUR_FEATURES.filter((f) => {
      const matchesCategory =
        activeCategory === "All" || f.category === activeCategory;

      if (!searchQuery.trim()) return matchesCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        f.title.toLowerCase().includes(q) ||
        f.summary.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        (f.route && f.route.toLowerCase().includes(q)) ||
        f.capabilities.some((c) => c.toLowerCase().includes(q)) ||
        f.proTips.some((p) => p.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  if (!isGuideCenterOpen) return null;

  const handleLaunchTrack = (trackId: string) => {
    startTour(trackId, 0);
  };

  const handleSpotlight = (f: TourFeatureItem) => {
    startSingleFeatureSpotlight(f.id);
  };

  const handleNavigate = (route?: string) => {
    if (route) {
      closeGuideCenter();
      router.push(route);
    }
  };

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-3 md:p-6 overflow-hidden">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeGuideCenter}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Main Modal Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="relative z-10 w-full max-w-6xl max-h-[92vh] bg-white dark:bg-[#131929] border border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white"
      >
        {/* Top Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/90 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Compass size={18} />
                </div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Zyoris Platform Tour & Feature Guide
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  {ALL_TOUR_FEATURES.length} Features
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1 max-w-3xl">
                Explore each feature, autonomous AI agent, workflow automation, and operational cockpit built into the Zyoris Central Intelligence Layer.
              </p>
            </div>

            <button
              type="button"
              onClick={closeGuideCenter}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search bar & Category filters */}
          <div className="mt-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Live Search */}
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any feature, route (/leads), or capability..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white placeholder:text-slate-500 font-medium transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Tour Launcher Button */}
            <button
              type="button"
              onClick={() => handleLaunchTrack("quickstart")}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/30 transition-all shrink-0"
            >
              <Play size={13} fill="currentColor" />
              <span>Launch Interactive Walkthrough</span>
            </button>
          </div>

          {/* Categories Pill Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pt-3.5 pb-0.5 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              const count =
                cat === "All"
                  ? ALL_TOUR_FEATURES.length
                  : ALL_TOUR_FEATURES.filter((f) => f.category === cat).length;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body: Curated Tracks Bar + Features Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Guided Tour Tracks Carousel / Cards (only shown if not actively searching) */}
          {!searchQuery && activeCategory === "All" && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
                  Curated Guided Walkthrough Tracks
                </h3>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Interactive step-by-step screen overlays
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {TOUR_TRACKS.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => handleLaunchTrack(track.id)}
                    className="p-4 rounded-xl bg-slate-50 hover:bg-indigo-50/50 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer group flex flex-col justify-between shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                          {renderTourIcon(track.iconName, "text-indigo-600 dark:text-indigo-400", 16)}
                        </div>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          <Clock size={11} />
                          {track.duration}
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-2.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {track.title}
                      </h4>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                        {track.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                      <span>{track.stepCount} Steps</span>
                      <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Start <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {activeCategory === "All"
                  ? "All Platform Capabilities"
                  : `${activeCategory} Features`}{" "}
                ({filteredFeatures.length})
              </h3>
            </div>

            {filteredFeatures.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700">
                <Compass size={36} className="mx-auto text-slate-400 dark:text-slate-500 mb-2" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No features matched &quot;{searchQuery}&quot;
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                  Try searching with a different keyword or select &quot;All&quot; categories.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFeatures.map((feat) => {
                  return (
                    <div
                      key={feat.id}
                      className="p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-lg transition-all duration-200 flex flex-col justify-between group shadow-xs"
                    >
                      <div>
                        {/* Header badge & icon */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            {renderTourIcon(feat.iconName, "", 18)}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {feat.badge && (
                              <span className="px-2 py-0.5 rounded-md text-[10.5px] font-extrabold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800">
                                {feat.badge}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title & Summary */}
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {feat.title}
                        </h4>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                          {feat.summary}
                        </p>

                        {/* Capabilities chips preview */}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {feat.capabilities.slice(0, 2).map((cap, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                            >
                              <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />
                              <span className="truncate max-w-[200px]">{cap}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedFeature(feat)}
                          className="text-xs font-bold text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 transition-colors"
                        >
                          Deep Dive
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSpotlight(feat)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 transition-colors flex items-center gap-1"
                            title="Spotlight on screen"
                          >
                            <Compass size={13} />
                            Spotlight
                          </button>

                          {feat.route && (
                            <button
                              type="button"
                              onClick={() => handleNavigate(feat.route)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1"
                              title="Go to page"
                            >
                              <ExternalLink size={13} />
                              Open
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Feature Deep Dive Side Drawer / Modal */}
      <AnimatePresence>
        {selectedFeature && (
          <div className="fixed inset-0 z-[10010] flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFeature(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="relative z-10 w-full max-w-lg h-full bg-white dark:bg-[#131929] border-l border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-white"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/90 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    {renderTourIcon(selectedFeature.iconName, "text-indigo-600 dark:text-indigo-400", 24)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {selectedFeature.category}
                    </span>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                      {selectedFeature.title}
                    </h3>
                    {selectedFeature.badge && (
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-extrabold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800">
                        {selectedFeature.badge}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFeature(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Overview
                  </h4>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-slate-800/90 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    {selectedFeature.description}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-2">
                    Core Capabilities
                  </h4>
                  <ul className="space-y-2">
                    {selectedFeature.capabilities.map((cap, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 leading-snug"
                      >
                        <CheckCircle2
                          size={15}
                          className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                        />
                        <span className="leading-relaxed">{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedFeature.proTips && selectedFeature.proTips.length > 0 && (
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2">
                      Pro Tips & Best Practices
                    </h4>
                    <div className="space-y-2">
                      {selectedFeature.proTips.map((tip, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-100 text-xs leading-relaxed"
                        >
                          <Lightbulb
                            size={16}
                            className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                          />
                          <span className="font-medium">{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedFeature.roles && (
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      Role Access
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFeature.roles.map((role, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/90 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const feat = selectedFeature;
                    setSelectedFeature(null);
                    handleSpotlight(feat);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Compass size={14} />
                  Spotlight on Screen
                </button>

                {selectedFeature.route && (
                  <button
                    type="button"
                    onClick={() => {
                      const route = selectedFeature.route;
                      setSelectedFeature(null);
                      handleNavigate(route);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ExternalLink size={14} />
                    Open Screen
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
