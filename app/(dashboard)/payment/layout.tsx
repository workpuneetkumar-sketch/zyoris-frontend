"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  Clock,
  BarChart3,
  HeartPulse,
} from "lucide-react";

// ── Navigation ───────────────────────────────────────────────

const NAV_ITEMS = [
  {
    label: "Invoices",
    href: "/payment/invoices",
    icon: FileText,
  },
  {
    label: "Dashboard",
    href: "/payment/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "History",
    href: "/payment/history",
    icon: Clock,
  },
  {
    label: "Analytics",
    href: "/payment/analytics",
    icon: BarChart3,
  },
  {
    label: "Health",
    href: "/payment/health",
    icon: HeartPulse,
  },
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function PaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      {/* ── Sub Navigation Bar ────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <nav className="flex gap-1 overflow-x-auto py-2 -mb-px">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                // Mark Invoices tab active only on exact /payment/invoices path
                (item.href === "/payment/invoices" && pathname === "/payment/invoices");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      {children}
    </div>
  );
}
