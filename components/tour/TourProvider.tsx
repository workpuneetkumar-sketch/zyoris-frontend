"use client";

import React, { ReactNode } from "react";
import { TourProvider as ContextProvider } from "@/context/TourContext";
import { TourSpotlight } from "./TourSpotlight";
import { FeatureGuideModal } from "./FeatureGuideModal";
import { TourWelcomeBanner } from "./TourWelcomeBanner";

export function TourProvider({ children }: { children: ReactNode }) {
  return (
    <ContextProvider>
      {children}
      <TourSpotlight />
      <FeatureGuideModal />
      <TourWelcomeBanner />
    </ContextProvider>
  );
}
