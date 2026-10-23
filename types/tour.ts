import { LucideIcon } from "lucide-react";

export type TourCategory =
  | "All"
  | "Executive Dashboards"
  | "CRM Ecosystem"
  | "Communication & Collab"
  | "Business Operations"
  | "Platform Intelligence"
  | "Admin & Agentic AI"
  | "Core Utilities";

export interface TourFeatureItem {
  id: string;
  title: string;
  category: TourCategory;
  route?: string;
  targetSelector?: string;
  badge?: string;
  summary: string;
  description: string;
  capabilities: string[];
  proTips: string[];
  roles?: string[];
  iconName: string;
}

export interface TourStep {
  id: string;
  title: string;
  category: TourCategory;
  targetSelector?: string;
  route?: string;
  summary: string;
  description: string;
  capabilities?: string[];
  proTips?: string[];
  badge?: string;
  position?: "bottom" | "top" | "left" | "right" | "center";
}

export interface TourTrack {
  id: string;
  title: string;
  description: string;
  category: TourCategory;
  duration: string;
  stepCount: number;
  iconName: string;
  stepIds: string[];
}
