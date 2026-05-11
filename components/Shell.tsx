"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import classNames from "classnames";
import {
  LucideIcon,
  LayoutDashboard,
  LineChart,
  Wallet,
  Handshake,
  Cog,
  Settings,
  User,
  LogOut,
} from "lucide-react";

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
}[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
    },
    {
      href: "/ceo",
      label: "CEO",
      icon: LineChart,
      roles: ["ADMIN", "CEO"],
    },
    {
      href: "/cfo",
      label: "CFO",
      icon: Wallet,
      roles: ["ADMIN", "CFO"],
    },
    {
      href: "/sales",
      label: "Sales",
      icon: Handshake,
      roles: ["ADMIN", "SALES_HEAD"],
    },
    {
      href: "/operations",
      label: "Operations",
      icon: Cog,
      roles: ["ADMIN", "OPERATIONS_HEAD"],
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
    },
    {
      href: "/profile",
      label: "My Profile",
      icon: User,
      roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
    },
  ];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const displayName =
    user?.name && user.name.trim().length > 0
      ? user.name
      : user?.email?.split("@")[0] ?? "User";

  const initials = displayName
    .split(" ")
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);

  const visibleNav = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : item.href === "/dashboard"
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-56 flex flex-col bg-white border-r border-gray-100 shadow-sm shrink-0">

        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 20 20" className="w-4 h-4">
              <path
                d="M10 2L2 7l8 5 8-5-8-5zM2 13l8 5 8-5M2 10l8 5 8-5"
                stroke="white"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">zyoris</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={classNames(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                )}
              >
                <Icon
                  size={17}
                  className={isActive ? "text-white" : "text-gray-400"}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        {user && (
          <div className="px-4 py-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email ?? ""}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}