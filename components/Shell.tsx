"use client";

import Link from "next/link";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
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
  Menu,
  X,
  Mail,
  Phone,
  ListTodo,
  Building2,
  DollarSign,
  Megaphone,
  Folder,
  BookOpen,
  Zap,
  TrendingUp,
  Crown,
  Cog,
} from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { ConfirmationModal } from "./ui/ConfirmationModal";
import { CrmSearch } from "./crm/CrmSearch";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "CRM",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
      },
      {
        href: "/leads",
        label: "Leads",
        icon: Users,
        roles: ["ADMIN", "CEO", "SALES_HEAD"],
      },
      {
        href: "/deals",
        label: "Deals",
        icon: Briefcase,
        roles: ["ADMIN", "CEO", "SALES_HEAD", "CFO"],
      },
      {
        href: "/contacts",
        label: "Contacts",
        icon: Users,
        roles: ["ADMIN", "CEO", "SALES_HEAD"],
      },
      {
        href: "/companies",
        label: "Companies",
        icon: Building2,
        roles: ["ADMIN", "CEO", "SALES_HEAD"],
      },
      {
        href: "/activities",
        label: "Activities",
        icon: CheckSquare,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
      },
    ],
  },
  {
    label: "Comms",
    items: [
      {
        href: "/email",
        label: "Email",
        icon: Mail,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
      },
      {
        href: "/whatsapp",
        label: "WhatsApp",
        icon: MessageSquare,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
      },
      {
        href: "/calls",
        label: "Calls",
        icon: Phone,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
      },
      {
        href: "/tasks",
        label: "Tasks",
        icon: ListTodo,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
      },
      {
        href: "/calendar",
        label: "Calendar",
        icon: Calendar,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
      },
      {
        href: "/messages",
        label: "Messages",
        icon: MessageSquare,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
      },
    ],
  },
  {
    label: "Business",
    items: [
      {
        href: "/hr",
        label: "HR",
        icon: UsersRound,
        roles: ["ADMIN", "CEO"],
      },
      {
        href: "/finance",
        label: "Finance",
        icon: DollarSign,
        roles: ["ADMIN", "CEO", "CFO"],
      },
      {
        href: "/marketing",
        label: "Marketing",
        icon: Megaphone,
        roles: ["ADMIN", "CEO"],
      },
      {
        href: "/projects",
        label: "Projects",
        icon: Folder,
        roles: ["ADMIN", "CEO", "OPERATIONS_HEAD"],
      },
      {
        href: "/documents",
        label: "Documents",
        icon: FileText,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
      },
      {
        href: "/knowledge-base",
        label: "Knowledge Base",
        icon: BookOpen,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        href: "/analytics",
        label: "Analytics",
        icon: BarChart2,
        roles: ["ADMIN", "CEO", "CFO"],
      },
      {
        href: "/reports",
        label: "Reports",
        icon: FileText,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
      },
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
      },
      {
        href: "/automation",
        label: "Automation",
        icon: Zap,
        roles: ["ADMIN", "CEO"],
      },
    ],
  },
  {
    label: "Role Dashboards",
    items: [
      {
        href: "/ceo",
        label: "CEO",
        icon: Crown,
        roles: ["ADMIN", "CEO"],
      },
      {
        href: "/cfo",
        label: "CFO",
        icon: DollarSign,
        roles: ["ADMIN", "CFO"],
      },
      {
        href: "/sales",
        label: "Sales",
        icon: TrendingUp,
        roles: ["ADMIN", "SALES_HEAD", "SALES_USER"],
      },
      {
        href: "/operations",
        label: "Operations",
        icon: Cog,
        roles: ["ADMIN", "OPERATIONS_HEAD", "OPS", "OPERATIONS"],
      },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [logoutCountdown, setLogoutCountdown] = useState(10);
  const logoutTriggeredRef = useRef(false);

  const closeLogoutModal = useCallback(() => {
    setLogoutModalOpen(false);
    setLogoutCountdown(10);
    logoutTriggeredRef.current = false;
  }, []);

  const openLogoutModal = useCallback(() => {
    logoutTriggeredRef.current = false;
    setLogoutCountdown(10);
    setLogoutModalOpen(true);
  }, []);

  const confirmLogout = useCallback(async () => {
    if (logoutTriggeredRef.current) return;
    logoutTriggeredRef.current = true;
    setLogoutModalOpen(false);
    setLogoutCountdown(10);
    await logout();
  }, [logout]);

  useEffect(() => {
    if (!logoutModalOpen) return;

    const interval = setInterval(() => {
      setLogoutCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [logoutModalOpen]);

  useEffect(() => {
    if (!logoutModalOpen || logoutCountdown > 0) return;
    if (logoutTriggeredRef.current) return;

    logoutTriggeredRef.current = true;
    setLogoutModalOpen(false);
    setLogoutCountdown(10);
    void logout();
  }, [logoutModalOpen, logoutCountdown, logout]);

  // ── Mobile Swipe Gesture Support ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    let touchStartX = 0;
    let touchStartY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      touchStartX = touch.screenX;
      touchStartY = touch.screenY;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const touchEndX = touch.screenX;
      const touchEndY = touch.screenY;
      
      const swipeDistanceX = touchEndX - touchStartX;
      const swipeDistanceY = touchEndY - touchStartY;
      
      // Only handle horizontal swipes
      if (Math.abs(swipeDistanceX) < Math.abs(swipeDistanceY)) return;
      
      // Swipe right to open (if on left edge of screen)
      if (swipeDistanceX > 80 && touchStartX < 50 && !drawerOpen) {
        setDrawerOpen(true);
      }
      // Swipe left to close
      if (swipeDistanceX < -80 && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [drawerOpen]);

  const displayName =
    user?.name && user.name.trim().length > 0
      ? user.name
      : user?.email?.split("@")[0] || "User";

  const visibleNavGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      user ? item.roles.includes(user.role) : item.href === "/dashboard"
    ),
  }))
    .filter((group) => group.items.length > 0);

  const NavLinks = () => (
    <>
      {visibleNavGroups.map((group) => (
        <div key={group.label} className="space-y-2">
          <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={classNames(
                    "flex items-center gap-3 px-3 py-[9px] rounded-lg text-[13.5px] font-medium transition-all duration-150 select-none",
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-[#1a237e] hover:bg-blue-50"
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
          </div>
        </div>
      ))}
    </>
  );

  const UserFooter = () =>
    user ? (
      <div className="px-4 py-4 mt-2 border-t border-gray-100">
        <div className="w-full flex items-center gap-3 rounded-xl px-1 py-1">
          {/* Left: avatar + name → goes to profile */}
          <button
            onClick={() => {
              router.push("/profile");
              setDrawerOpen(false);
            }}
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
                  .map((p: string) => p[0]?.toUpperCase() || "")
                  .join("")
                  .slice(0, 2)}
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p
                className="text-[13px] font-semibold truncate"
                style={{ color: "#1a237e" }}
              >
                {displayName}
              </p>
              <p className="text-[11.5px] text-gray-400 truncate">
                {user?.email || ""}
              </p>
            </div>
          </button>

          {/* Notification bell + logout */}
          <div className="flex items-center gap-1 shrink-0">
            <NotificationBell />
            <button
              onClick={openLogoutModal}
              className="p-1 rounded-lg hover:bg-red-50 transition-colors group"
              title="Logout"
            >
              <ChevronRight
                size={15}
                className="text-gray-400 group-hover:text-red-500 transition-colors"
              />
            </button>
          </div>
        </div>
      </div>
    ) : null;

  const LogoMark = ({ small = false }: { small?: boolean }) => (
    <div className="flex items-center gap-2.5">
      <div
        className={classNames(
          "bg-blue-600 rounded-lg flex items-center justify-center shrink-0",
          small ? "w-6 h-6" : "w-8 h-8"
        )}
      >
        <svg
          viewBox="0 0 20 20"
          className={small ? "w-3 h-3" : "w-4 h-4"}
        >
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
      <span
        className={classNames(
          "font-extrabold tracking-tight",
          small ? "text-base" : "text-[1.25rem]"
        )}
        style={{ color: "#1a237e" }}
      >
        zyoris
      </span>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">

      {/* ── Desktop Sidebar (md and above) ── */}
      <aside className="hidden md:flex w-[220px] flex-col bg-white border-r border-gray-100 shrink-0">
        <div className="px-5 pt-6 pb-5">
          <LogoMark />
        </div>
        <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
          <NavLinks />
        </nav>
        <UserFooter />
      </aside>

      {/* ── Mobile Drawer (below md) ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop with smooth animation */}
          <div
            className="absolute inset-0 bg-black/40 transition-opacity duration-300"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel with smooth slide animation */}
          <aside className="absolute top-0 left-0 bottom-0 w-[280px] bg-white flex flex-col shadow-2xl z-50 transition-transform duration-300 ease-out">
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <LogoMark />
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close menu"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
              <NavLinks />
            </nav>
            <UserFooter />
          </aside>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar (desktop + mobile) */}
        <header className="flex items-center gap-4 px-4 md:px-6 py-3 bg-white border-b border-gray-100 shrink-0">
          {/* Mobile menu button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} className="text-[#1a237e]" />
          </button>

          {/* Mobile logo */}
          <div className="md:hidden">
            <LogoMark small />
          </div>

          {/* Search component */}
          <div className="flex-1 flex justify-start">
            <CrmSearch />
          </div>

          {/* Right side: notification bell (desktop) */}
          <div className="hidden md:block">
            <NotificationBell />
          </div>

          {/* Mobile notification bell */}
          <div className="md:hidden">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>

      <ConfirmationModal
        isOpen={logoutModalOpen}
        title="Log out"
        message="Are you sure you want to log out?"
        confirmText="Logout Now"
        cancelText="Cancel"
        variant="danger"
        countdownSeconds={logoutModalOpen ? logoutCountdown : null}
        onConfirm={confirmLogout}
        onCancel={closeLogoutModal}
      />
    </div>
  );
}