"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  TourCategory,
  TourFeatureItem,
  TourStep,
  TourTrack,
} from "@/types/tour";
import {
  ALL_TOUR_FEATURES,
  TOUR_TRACKS,
  buildTourStepsForTrack,
  getFeatureById,
  getTrackById,
} from "@/constants/tourData";

interface TourContextValue {
  isOpen: boolean;
  currentTrack: TourTrack | null;
  currentStepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
  isPaused: boolean;
  isGuideCenterOpen: boolean;
  activeCategory: TourCategory;
  searchQuery: string;
  welcomeBannerVisible: boolean;
  hasCompletedTour: boolean;

  // Actions
  startTour: (trackId?: string, startStepIndex?: number) => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  togglePause: () => void;
  openGuideCenter: (category?: TourCategory) => void;
  closeGuideCenter: () => void;
  setActiveCategory: (cat: TourCategory) => void;
  setSearchQuery: (query: string) => void;
  dismissWelcomeBanner: () => void;
  resetTourHistory: () => void;
  startSingleFeatureSpotlight: (featureId: string) => void;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

const TOUR_COMPLETED_KEY = "zyoris-tour-completed";
const TOUR_WELCOME_DISMISSED_KEY = "zyoris-tour-welcome-dismissed";

export function TourProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string>("quickstart");
  const [currentSteps, setCurrentSteps] = useState<TourStep[]>(() =>
    buildTourStepsForTrack("quickstart")
  );
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [isGuideCenterOpen, setIsGuideCenterOpen] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<TourCategory>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [hasCompletedTour, setHasCompletedTour] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(TOUR_COMPLETED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [welcomeBannerVisible, setWelcomeBannerVisible] = useState<boolean>(false);

  // Check if first-time user after mount (don't show on login/register pages)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const dismissed = localStorage.getItem(TOUR_WELCOME_DISMISSED_KEY) === "true";
      const completed = localStorage.getItem(TOUR_COMPLETED_KEY) === "true";
      const isAuthPage =
        pathname === "/login" ||
        pathname?.startsWith("/login") ||
        pathname === "/register" ||
        pathname?.startsWith("/register");

      if (!dismissed && !completed && !isAuthPage) {
        // Show welcome banner with a slight delay so page settles
        const timer = setTimeout(() => {
          setWelcomeBannerVisible(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, [pathname]);

  const currentTrack = getTrackById(currentTrackId) ?? TOUR_TRACKS[0];
  const currentStep = currentSteps[currentStepIndex] ?? null;
  const totalSteps = currentSteps.length;

  const startTour = useCallback(
    (trackId: string = "quickstart", startStepIndex: number = 0) => {
      const steps = buildTourStepsForTrack(trackId);
      if (steps.length === 0) return;
      setCurrentTrackId(trackId);
      setCurrentSteps(steps);
      setCurrentStepIndex(
        Math.max(0, Math.min(startStepIndex, steps.length - 1))
      );
      setIsOpen(true);
      setIsPaused(true);
      setIsGuideCenterOpen(false);
      setWelcomeBannerVisible(false);
    },
    []
  );

  const startSingleFeatureSpotlight = useCallback((featureId: string) => {
    const feat = getFeatureById(featureId);
    if (!feat) return;

    const singleStep: TourStep = {
      id: feat.id,
      title: feat.title,
      category: feat.category,
      targetSelector: feat.targetSelector,
      route: feat.route,
      summary: feat.summary,
      description: feat.description,
      capabilities: feat.capabilities,
      proTips: feat.proTips,
      badge: feat.badge,
      position: "bottom",
    };

    setCurrentTrackId("custom");
    setCurrentSteps([singleStep]);
    setCurrentStepIndex(0);
    setIsOpen(true);
    setIsPaused(true);
    setIsGuideCenterOpen(false);
  }, []);

  const stopTour = useCallback(() => {
    setIsOpen(false);
    setIsPaused(true);
    try {
      localStorage.setItem(TOUR_COMPLETED_KEY, "true");
      setHasCompletedTour(true);
    } catch {}
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      if (prev >= currentSteps.length - 1) {
        stopTour();
        return prev;
      }
      return prev + 1;
    });
  }, [currentSteps.length, stopTour]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < currentSteps.length) {
        setCurrentStepIndex(index);
      }
    },
    [currentSteps.length]
  );

  const togglePause = useCallback(() => {
    setIsPaused((p) => !p);
  }, []);

  const openGuideCenter = useCallback((category?: TourCategory) => {
    if (category) {
      setActiveCategory(category);
    }
    setIsGuideCenterOpen(true);
    setWelcomeBannerVisible(false);
  }, []);

  const closeGuideCenter = useCallback(() => {
    setIsGuideCenterOpen(false);
  }, []);

  const dismissWelcomeBanner = useCallback(() => {
    setWelcomeBannerVisible(false);
    try {
      localStorage.setItem(TOUR_WELCOME_DISMISSED_KEY, "true");
    } catch {}
  }, []);

  const resetTourHistory = useCallback(() => {
    try {
      localStorage.removeItem(TOUR_COMPLETED_KEY);
      localStorage.removeItem(TOUR_WELCOME_DISMISSED_KEY);
      setHasCompletedTour(false);
      setWelcomeBannerVisible(true);
    } catch {}
  }, []);

  // Keyboard navigation for active tour
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

  const value: TourContextValue = {
    isOpen,
    currentTrack,
    currentStepIndex,
    currentStep,
    totalSteps,
    isPaused,
    isGuideCenterOpen,
    activeCategory,
    searchQuery,
    welcomeBannerVisible,
    hasCompletedTour,

    startTour,
    stopTour,
    nextStep,
    prevStep,
    goToStep,
    togglePause,
    openGuideCenter,
    closeGuideCenter,
    setActiveCategory,
    setSearchQuery,
    dismissWelcomeBanner,
    resetTourHistory,
    startSingleFeatureSpotlight,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}
