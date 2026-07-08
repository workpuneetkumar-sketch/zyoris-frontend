// types/savedViews.ts
// Types for Advanced Search + Saved Views (Task 4)

import { LeadsFilters } from "./leads";

export interface SavedView {
  id: string;
  name: string;
  filters: LeadsFilters & {
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
  };
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  isDefault?: boolean;
}

export interface CreateSavedViewPayload {
  name: string;
  filters: SavedView["filters"];
}

export interface UpdateSavedViewPayload {
  name?: string;
  filters?: SavedView["filters"];
}

export interface SavedViewsResponse {
  views: SavedView[];
  total: number;
}

export interface AdvancedLeadsFilters extends LeadsFilters {
  tags: string[];
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
}

export const DEFAULT_ADVANCED_FILTERS: AdvancedLeadsFilters = {
  status: "All Status",
  source: "All Sources",
  owner: "All Owners",
  search: "",
  tags: [],
  dateFrom: "",
  dateTo: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  pageSize: 10,
};

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
