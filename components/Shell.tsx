"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import classNames from "classnames";
import {
  LucideIcon,
  LayoutDashboard,
  BarChart2,
  Users,
  Briefcase,
  CheckSquare,
  FileText,
  Calendar,
  UsersRound,
  MessageSquare,
  Settings,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
}[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"] },
    { href: "/analytics", label: "Analytics", icon: BarChart2, roles: ["ADMIN", "CEO", "CFO"] },
    { href: "/leads", label: "Leads", icon: Users, roles: ["ADMIN", "CEO", "SALES_HEAD"] },
    { href: "/deals", label: "Deals", icon: Briefcase, roles: ["ADMIN", "CEO", "SALES_HEAD", "CFO"] },
    { href: "/activities", label: "Activities", icon: CheckSquare, roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"] },
    { href: "/reports", label: "Reports", icon: FileText, roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"] },
    { href: "/calendar", label: "Calendar", icon: Calendar, roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"] },
    { href: "/team", label: "Team", icon: UsersRound, roles: ["ADMIN", "CEO"] },
    { href: "/messages", label: "Messages", icon: MessageSquare, roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"] },
    { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"] },
  ];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const displayName =
    user?.name && user.name.trim().length > 0
      ? user.name
      : user?.email?.split("@")[0] ?? "User";

  const visibleNav = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : item.href === "/dashboard"
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-[220px] flex flex-col bg-white border-r border-gray-100 shrink-0">

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <svg viewBox="0 0 20 20" className="w-4 h-4">
              <path
                d="M10 2L2 7l8 5 8-5-8-5zM2 13l8 5 8-5M2 10l8 5 8-5"
                stroke="white"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-[1.25rem] font-extrabold tracking-tight" style={{ color: "#1a237e" }}>
            zyoris
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
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
                  "flex items-center gap-3 px-3 py-[9px] rounded-lg text-[13.5px] font-medium transition-all duration-150 select-none",
                  isActive ? "bg-blue-600 text-white" : "text-[#1a237e] hover:bg-blue-50"
                )}
              >
                <Icon
                  size={17}
                  strokeWidth={isActive ? 2 : 1.75}
                  className={isActive ? "text-white" : "text-[#1a237e]"}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        {user && (
          <div className="px-4 py-4 mt-2 border-t border-gray-100">
            <div className="w-full flex items-center gap-3 rounded-xl px-1 py-1">

              {/* Left: avatar + name → goes to profile */}
              <button
                onClick={() => router.push("/profile")}
                className="flex items-center gap-3 flex-1 min-w-0 hover:bg-gray-50 rounded-xl transition-colors"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={displayName}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border border-blue-100"
                    style={{ background: "#e8eaf6", color: "#1a237e" }}
                  >
                    {displayName
                      .split(" ")
                      .map((p: string) => p[0]?.toUpperCase() ?? "")
                      .join("")
                      .slice(0, 2)}
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-semibold truncate" style={{ color: "#1a237e" }}>
                    {displayName}
                  </p>
                  <p className="text-[11.5px] text-gray-400 truncate">
                    {user?.email ?? ""}
                  </p>
                </div>
              </button>

              {/* Right: arrow → triggers logout */}
              <button
                onClick={logout}
                className="p-1 rounded-lg hover:bg-red-50 transition-colors group shrink-0"
                title="Logout"
              >
                <ChevronRight
                  size={15}
                  className="text-gray-400 group-hover:text-red-500 transition-colors"
                />
              </button>

            </div>
          </div>
        )}

      </aside> {/* ✅ closes <aside> */}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

    </div> // ✅ closes root <div>
  );
}