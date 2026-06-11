// app/finance/expenses/components/constants.ts

import {
  Briefcase,
  Monitor,
  Megaphone,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  PiggyBank,
} from "lucide-react";
import { ExpenseCategory } from "@/lib/api/finance/expenseApi";

// ── Categories ───────────────────────────────────────────
export const CATEGORIES: { value: ExpenseCategory; label: string; icon: any; color: string }[] = [
  { value: "TRAVEL", label: "Travel", icon: Briefcase, color: "text-blue-600 bg-blue-50" },
  { value: "OFFICE", label: "Office Supplies", icon: Monitor, color: "text-purple-600 bg-purple-50" },
  { value: "MARKETING", label: "Marketing", icon: Megaphone, color: "text-pink-600 bg-pink-50" },
  { value: "OTHER", label: "Other", icon: MoreHorizontal, color: "text-gray-600 bg-gray-50" },
];

// ── Status Styles ────────────────────────────────────────
export const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; dot: string; icon: any }> = {
  PENDING: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
    icon: Clock,
  },
  APPROVED: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  REIMBURSED: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    dot: "bg-sky-500",
    icon: PiggyBank,
  },
};

// ── Pagination ───────────────────────────────────────────
export const PAGE_SIZE = 10;

// ── Helper Functions ─────────────────────────────────────
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function formatDateForExport(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(dateStr);
}

export function getCategoryInfo(category: string) {
  return CATEGORIES.find((c) => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
}