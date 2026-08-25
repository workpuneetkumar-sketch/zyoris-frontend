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
  CreditCard,
  Megaphone,
  Folder,
  BookOpen,
  StickyNote,
  Zap,
  TrendingUp,
  Crown,
  Cog,
  Shield,
  KeyRound,
  UserCog,
  FileSearch,
  Brain,
  Layers,
  Plug,
  Grid3X3,
  Video,
  Bell,
  Inbox,
  ChevronDown,
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
        href: "/ai-insights",
        label: "AI Insights",
        icon: Brain,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
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
      {
        href: "/dashboard/reminders",
        label: "Reminders",
        icon: Bell,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
      },
    ],
  },
  {
    label: "Communication",
    items: [
      {
        href: "/communications",
        label: "Communication Hub",
        icon: Inbox,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "SALES_USER", "OPERATIONS_HEAD", "OPS", "OPERATIONS", "HR", "MANAGER", "EMPLOYEE", "USER"],
      },
      {
        href: "/email",
        label: "Email",
        icon: Mail,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "SALES_USER", "OPERATIONS_HEAD", "OPS", "OPERATIONS", "HR", "MANAGER", "EMPLOYEE", "USER"],
      },
      {
        href: "/whatsapp",
        label: "WhatsApp",
        icon: MessageSquare,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "SALES_USER", "OPERATIONS_HEAD", "OPS", "OPERATIONS", "HR", "MANAGER", "EMPLOYEE", "USER"],
      },
      {
        href: "/calls",
        label: "Calls",
        icon: Phone,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "SALES_USER", "OPERATIONS_HEAD", "OPS", "OPERATIONS", "HR", "MANAGER", "EMPLOYEE", "USER"],
      },
      {
        href: "/tasks",
        label: "Tasks",
        icon: ListTodo,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "SALES_USER", "OPERATIONS_HEAD", "OPS", "OPERATIONS", "HR", "MANAGER", "EMPLOYEE", "USER"],
      },
      {
        href: "/calendar",
        label: "Calendar",
        icon: Calendar,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "SALES_USER", "OPERATIONS_HEAD", "OPS", "OPERATIONS", "HR", "MANAGER", "EMPLOYEE", "USER"],
      },
      {
        href: "/messages",
        label: "Messages",
        icon: MessageSquare,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "SALES_USER", "OPERATIONS_HEAD", "OPS", "OPERATIONS", "HR", "MANAGER", "EMPLOYEE", "USER"],
      },
      {
        href: "/meetings",
        label: "Meetings",
        icon: Video,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "SALES_USER", "OPERATIONS_HEAD", "OPS", "OPERATIONS", "HR", "MANAGER", "EMPLOYEE", "USER"],
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
        href: "/payment/invoices",
        label: "Payments",
        icon: CreditCard,
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
      {
        href: "/notes",
        label: "Notes",
        icon: StickyNote,
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
        href: "/automation",
        label: "Automation",
        icon: Zap,
        roles: ["ADMIN", "CEO"],
      },
    ],
  },
  {
    label: "Integration",
    items: [
      {
        href: "/integrations",
        label: "Integration",
        icon: Layers,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "SALES_USER", "OPERATIONS_HEAD", "OPS", "OPERATIONS", "HR", "MANAGER", "EMPLOYEE", "USER"],
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        href: "/settings",
        label: "Settings",
        icon: Settings,
        roles: ["ADMIN", "CEO", "CFO", "SALES_HEAD", "OPERATIONS_HEAD"],
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
      {
        href: "/admin",
        label: "Admin",
        icon: Shield,
        roles: ["ADMIN"],
      },
    ],
  },
  {
    label: "Admin Tools",
    items: [
      {
        href: "/admin/roles",
        label: "Roles",
        icon: KeyRound,
        roles: ["ADMIN"],
      },
      {
        href: "/admin/permission-matrix",
        label: "Permission Matrix",
        icon: Grid3X3,
        roles: ["ADMIN"],
      },
      {
        href: "/admin/user-roles",
        label: "User Roles",
        icon: UserCog,
        roles: ["ADMIN"],
      },
      {
        href: "/admin/audit",
        label: "Audit Logs",
        icon: FileSearch,
        roles: ["ADMIN"],
      },
    ],
  },
];

const GROUP_ICONS: Record<string, LucideIcon> = {
  CRM: Layers,
  Communication: Inbox,
  Business: Briefcase,
  Platform: Grid3X3,
  Integration: Plug,
  Management: Settings,
  "Role Dashboards": Crown,
  "Admin Tools": Shield,
  Navigation: Layers,
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, sidebarItems, visibleDashboards, visibleModules } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [logoutCountdown, setLogoutCountdown] = useState(10);
  // Tracks which sidebar module groups (CRM, Comms, Business, ...) are expanded.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  const logoutTriggeredRef = useRef(false);
  const sidebarNavRef = useRef<HTMLDivElement>(null);
  const SIDEBAR_SCROLL_KEY = "sidebar-scroll-position";
  const hasMountedSidebarRef = useRef(false);

  // Save sidebar scroll position when scrolling
  const handleSidebarScroll = () => {
    if (sidebarNavRef.current) {
      localStorage.setItem(SIDEBAR_SCROLL_KEY, sidebarNavRef.current.scrollTop.toString());
    }
  };

  // On first load, restore the last known scroll position (e.g. after a page refresh).
  // On in-app navigation between modules, don't restore a stale pixel offset — instead
  // just make sure the newly active link is visible, without jumping the list elsewhere.
  useEffect(() => {
    if (!sidebarNavRef.current) return;

    if (!hasMountedSidebarRef.current) {
      hasMountedSidebarRef.current = true;
      const savedScrollTop = localStorage.getItem(SIDEBAR_SCROLL_KEY);
      if (savedScrollTop) {
        sidebarNavRef.current.scrollTop = parseInt(savedScrollTop, 10);
      }
      return;
    }

    requestAnimationFrame(() => {
      const activeEl = sidebarNavRef.current?.querySelector<HTMLElement>(
        '[data-active-link="true"]'
      );
      activeEl?.scrollIntoView({ block: "nearest" });
    });
  }, [pathname]);

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

  // Use dynamic RBAC sidebar when available; fall back to static role-based filtering.
  // Communication group is ALWAYS injected — for every role, regardless of API response.
  const COMMUNICATION_STATIC_GROUP = {
    label: "Communication",
    items: [
      { href: "/communications", label: "Communication Hub", icon: Inbox },
      { href: "/email",          label: "Email",             icon: Mail },
      { href: "/whatsapp",       label: "WhatsApp",          icon: MessageSquare },
      { href: "/calls",          label: "Calls",             icon: Phone },
      { href: "/tasks",          label: "Tasks",             icon: ListTodo },
      { href: "/calendar",       label: "Calendar",          icon: Calendar },
      { href: "/messages",       label: "Messages",          icon: MessageSquare },
      { href: "/meetings",       label: "Meetings",          icon: Video },
    ],
  };

  const ADMIN_TOOL_ITEMS = [
    { href: "/admin", label: "Admin", icon: Shield },
    { href: "/admin/roles", label: "Roles", icon: KeyRound },
    { href: "/admin/permission-matrix", label: "Permission Matrix", icon: Grid3X3 },
    { href: "/admin/user-roles", label: "User Roles", icon: UserCog },
    { href: "/admin/audit", label: "Audit Logs", icon: FileSearch },
  ];

  const ROLE_DASHBOARD_LABELS: Record<string, string> = {
    ceo: "CEO",
    cfo: "CFO",
    sales: "Sales",
    operations: "Operations",
    admin: "Admin",
  };

  const visibleNavGroups = (() => {
    if (sidebarItems && sidebarItems.length > 0) {

      // ── Icon map (key/route slug → Lucide component) ──────────────────
      const iconMap: Record<string, LucideIcon> = {
        dashboard: LayoutDashboard, "layout-dashboard": LayoutDashboard,
        reminders: Bell, bell: Bell,
        leads: Users, users: Users,
        deals: Briefcase, briefcase: Briefcase,
        contacts: Users,
        companies: Building2,
        "ai-insights": Brain, brain: Brain,
        activities: CheckSquare, "check-square": CheckSquare,
        communications: Inbox, inbox: Inbox,
        email: Mail, mail: Mail,
        whatsapp: MessageSquare, "message-square": MessageSquare, messages: MessageSquare,
        calls: Phone, phone: Phone,
        tasks: ListTodo, "list-todo": ListTodo,
        calendar: Calendar, "calendar-check": Calendar, "calendar-x": Calendar,
        meetings: Video, video: Video,
        hr: UsersRound, "users-round": UsersRound, employees: UsersRound,
        attendance: Calendar, leaves: Calendar, payslips: FileText, shifts: Calendar,
        finance: DollarSign, "dollar-sign": DollarSign, "wallet": DollarSign,
        invoices: CreditCard, "credit-card": CreditCard, expenses: DollarSign, payment: CreditCard,
        marketing: Megaphone, megaphone: Megaphone, campaigns: Megaphone,
        projects: Folder, "folder-kanban": Folder, folder: Folder,
        documents: FileText, "file-text": FileText,
        "knowledge-base": BookOpen, knowledge: BookOpen, "book-open": BookOpen,
        notes: StickyNote, "sticky-note": StickyNote,
        analytics: BarChart2, "bar-chart-2": BarChart2, "bar-chart-3": BarChart2, "line-chart": TrendingUp,
        reports: FileText, "file-search": FileSearch,
        settings: Settings,
        automation: Zap, bot: Zap, zap: Zap,
        ceo: Crown, crown: Crown,
        cfo: DollarSign,
        sales: TrendingUp, "trending-up": TrendingUp,
        operations: Cog, cog: Cog,
        admin: Shield, shield: Shield,
        roles: KeyRound, "key-round": KeyRound,
        "permission-matrix": Grid3X3,
        "user-roles": UserCog, "user-cog": UserCog,
        audit: FileSearch,
        crm: Layers,
        notifications: Bell,
      };

      // ── Route normalization: API route → real Next.js page route ──────
      const ROUTE_NORMALIZE: Record<string, string> = {
        "/crm": "/leads",
        "/hr/employees": "/hr/employees",
        "/hr/attendance": "/hr/attendance",
        "/hr/leaves": "/hr/leaves",
        "/finance/invoices": "/payment/invoices",
        "/finance/expenses": "/finance/expenses",
        "/dashboard/ceo": "/ceo",
        "/dashboard/cfo": "/cfo",
        "/dashboard/sales": "/sales",
        "/dashboard/operations": "/operations",
      };

      // ── Key → expanded items ──────────────────────────────────────────
      const KEY_EXPANSION: Record<string, { href: string; label: string; iconKey: string }[]> = {
        crm: [
          { href: "/leads",       label: "Leads",       iconKey: "leads"       },
          { href: "/deals",       label: "Deals",       iconKey: "deals"       },
          { href: "/contacts",    label: "Contacts",    iconKey: "contacts"    },
          { href: "/companies",   label: "Companies",   iconKey: "companies"   },
          { href: "/activities",  label: "Activities",  iconKey: "activities"  },
          { href: "/ai-insights", label: "AI Insights", iconKey: "ai-insights" },
        ],
        communication: [
          { href: "/communications", label: "Communication Hub", iconKey: "communications" },
          { href: "/email",          label: "Email",             iconKey: "email"          },
          { href: "/whatsapp",       label: "WhatsApp",          iconKey: "whatsapp"       },
          { href: "/calls",          label: "Calls",             iconKey: "calls"          },
          { href: "/tasks",          label: "Tasks",             iconKey: "tasks"          },
          { href: "/calendar",       label: "Calendar",          iconKey: "calendar"       },
          { href: "/messages",       label: "Messages",          iconKey: "messages"       },
          { href: "/meetings",       label: "Meetings",          iconKey: "meetings"       },
        ],
        communications: [
          { href: "/communications", label: "Communication Hub", iconKey: "communications" },
          { href: "/email",          label: "Email",             iconKey: "email"          },
          { href: "/whatsapp",       label: "WhatsApp",          iconKey: "whatsapp"       },
          { href: "/calls",          label: "Calls",             iconKey: "calls"          },
          { href: "/tasks",          label: "Tasks",             iconKey: "tasks"          },
          { href: "/calendar",       label: "Calendar",          iconKey: "calendar"       },
          { href: "/messages",       label: "Messages",          iconKey: "messages"       },
          { href: "/meetings",       label: "Meetings",          iconKey: "meetings"       },
        ],
      };

      // ── Group buckets ─────────────────────────────────────────────────
      const KEY_TO_GROUP: Record<string, string> = {
        leads: "CRM", deals: "CRM", "ai-insights": "CRM",
        contacts: "CRM", companies: "CRM", activities: "CRM",
        reminders: "CRM", crm: "CRM",
        communications: "Communication", communication: "Communication",
        "communication-hub": "Communication",
        email: "Communication", whatsapp: "Communication", calls: "Communication",
        tasks: "Communication", calendar: "Communication",
        messages: "Communication", meetings: "Communication",
        chat: "Communication", sms: "Communication",
        hr: "Business", employees: "Business", attendance: "Business",
        leaves: "Business", payslips: "Business", shifts: "Business",
        finance: "Business", invoices: "Business", expenses: "Business",
        payment: "Business", marketing: "Business", campaigns: "Business",
        projects: "Business", documents: "Business",
        "knowledge-base": "Business", knowledge: "Business", notes: "Business",
        analytics: "Platform", reports: "Platform", automation: "Platform",
        settings: "Management",
        ceo: "Role Dashboards", cfo: "Role Dashboards",
        sales: "Role Dashboards", operations: "Role Dashboards", admin: "Role Dashboards",
        roles: "Admin Tools", "permission-matrix": "Admin Tools",
        "user-roles": "Admin Tools", audit: "Admin Tools",
      };

      const ROUTE_TO_GROUP: Record<string, string> = {
        "/leads": "CRM", "/deals": "CRM", "/ai-insights": "CRM",
        "/contacts": "CRM", "/companies": "CRM", "/activities": "CRM",
        "/dashboard/reminders": "CRM", "/crm": "CRM",
        "/communications": "Communication", "/communication": "Communication",
        "/email": "Communication", "/whatsapp": "Communication", "/calls": "Communication",
        "/tasks": "Communication", "/calendar": "Communication",
        "/messages": "Communication", "/meetings": "Communication",
        "/hr": "Business", "/hr/employees": "Business", "/hr/attendance": "Business",
        "/hr/leaves": "Business", "/hr/payroll": "Business",
        "/finance": "Business", "/finance/expenses": "Business",
        "/payment": "Business", "/payment/invoices": "Business",
        "/marketing": "Business", "/projects": "Business",
        "/documents": "Business", "/knowledge-base": "Business", "/notes": "Business",
        "/analytics": "Platform", "/reports": "Platform", "/automation": "Platform",
        "/settings": "Management",
        "/ceo": "Role Dashboards", "/cfo": "Role Dashboards",
        "/sales": "Role Dashboards", "/operations": "Role Dashboards", "/admin": "Role Dashboards",
        "/admin/roles": "Admin Tools", "/admin/permission-matrix": "Admin Tools",
        "/admin/user-roles": "Admin Tools", "/admin/audit": "Admin Tools",
      };

      const GROUP_ORDER = [
        "CRM", "Communication", "Business", "Platform",
        "Integration", "Management", "Role Dashboards", "Admin Tools",
      ];

      const getIcon = (iconKey: string, item?: (typeof sidebarItems)[number]): LucideIcon => {
        const apiIconSlug = (item?.icon ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "-");
        return iconMap[apiIconSlug] ?? iconMap[iconKey] ?? Settings;
      };

      // ── Process each sidebar item ─────────────────────────────────────
      const itemsByGroup: Record<string, { href: string; label: string; icon: LucideIcon }[]> = {};

      const addItem = (groupLabel: string, href: string, label: string, icon: LucideIcon) => {
        if (!itemsByGroup[groupLabel]) itemsByGroup[groupLabel] = [];
        if (!itemsByGroup[groupLabel].some((x) => x.href === href)) {
          itemsByGroup[groupLabel].push({ href, label, icon });
        }
      };

      const adminModules = new Set([
        "users",
        "roles",
        "audit",
        "settings",
        "notifications",
        "admin",
      ]);

      visibleDashboards
        .filter((item) => item.visible !== false && item.route)
        .forEach((item) => {
          const key = (item.key ?? "").toLowerCase();
          const href = ROUTE_NORMALIZE[item.route] ?? item.route;
          const label =
            ROLE_DASHBOARD_LABELS[key] ??
            key.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

          if (href) addItem("Role Dashboards", href, label, Crown);
        });

      const hasAdminToolAccess =
        sidebarItems.some((item) => {
          const key = (item.key ?? "").toLowerCase();
          const route = (item.route ?? "").toLowerCase();
          return key === "settings" || key === "roles" || key === "users" || key === "audit" || route.startsWith("/admin");
        }) || visibleModules.some((module) => adminModules.has((module ?? "").toLowerCase()));

      if (hasAdminToolAccess) {
        ADMIN_TOOL_ITEMS.forEach((item) => addItem("Admin Tools", item.href, item.label, item.icon));
      }

      sidebarItems
        .filter((item) => item.visible !== false)
        .forEach((item) => {
          const keySlug = (item.key ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "-");
          const rawRoute = item.route ?? "";

          if (keySlug === "dashboard" || rawRoute === "/dashboard") return;

          if (KEY_EXPANSION[keySlug]) {
            const groupLabel = KEY_TO_GROUP[keySlug] ?? "Platform";
            KEY_EXPANSION[keySlug].forEach((sub) => {
              addItem(groupLabel, sub.href, sub.label, getIcon(sub.iconKey));
            });
            return;
          }

          const href = ROUTE_NORMALIZE[rawRoute] ?? rawRoute;
          const groupLabel =
            KEY_TO_GROUP[keySlug] ??
            ROUTE_TO_GROUP[href] ??
            ROUTE_TO_GROUP[rawRoute] ??
            "Platform";

          addItem(groupLabel, href, item.label, getIcon(keySlug, item));
        });

      // ── Always force-inject the full Communication and Integration groups ──
      itemsByGroup["Communication"] = COMMUNICATION_STATIC_GROUP.items.map((i) => ({ ...i }));
      itemsByGroup["Integration"] = [
        { href: "/integrations", label: "Integration", icon: Layers },
      ];

      // ── Build groups in display order ─────────────────────────────────
      const groups = GROUP_ORDER
        .filter((label) => itemsByGroup[label]?.length)
        .map((label) => ({ label, items: itemsByGroup[label] }));

      if (groups.length > 0) return groups;
    }

    // ── Static fallback (no API data) ─────────────────────────────────
    // Communication is always shown to every role — skip the role filter for it.
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.label === "Communication"
        ? group.items
        : group.items.filter((item) =>
            user ? item.roles.includes(user.role) : item.href === "/dashboard"
          ),
    })).filter((group) => group.items.length > 0);
  })();

  // Auto-expand whichever module group contains the currently active page,
  // without collapsing a group the user has already opened/closed manually.
  useEffect(() => {
    setOpenGroups((prev) => {
      let changed = false;
      const next = { ...prev };
      visibleNavGroups.forEach((group) => {
        if (next[group.label] !== undefined) return;
        const hasActiveItem = group.items.some(
          (item) =>
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href))
        );
        if (hasActiveItem) {
          next[group.label] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const MANAGEMENT_GROUP_LABELS = new Set(["Management", "Role Dashboards", "Admin Tools"]);

  const DashboardLink = () => {
    const isActive = pathname === "/dashboard";
    return (
      <Link
        href="/dashboard"
        onClick={() => setDrawerOpen(false)}
        className={classNames(
          "flex items-center gap-2.5 px-2.5 py-2 mb-1 rounded-xl text-[13.5px] font-semibold transition-all duration-150 select-none",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-text-secondary hover:bg-surface-hover"
        )}
      >
        <span
          className={classNames(
            "flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors",
            isActive
              ? "bg-white/20 text-primary-foreground"
              : "bg-surface border border-border text-text-secondary"
          )}
        >
          <LayoutDashboard size={15} strokeWidth={2} />
        </span>
        <span>Dashboard</span>
      </Link>
    );
  };

  const NavLinks = () => (
    <>
      <DashboardLink />
      {visibleNavGroups.map((group, idx) => {
        const isOpen = openGroups[group.label] ?? false;
        const GroupIcon = GROUP_ICONS[group.label] ?? Layers;
        const prevGroup = visibleNavGroups[idx - 1];
        const showManagementLabel =
          MANAGEMENT_GROUP_LABELS.has(group.label) &&
          (!prevGroup || !MANAGEMENT_GROUP_LABELS.has(prevGroup.label));

        // Groups with just one item (e.g. "Management" → "Settings") skip the
        // expand/collapse step entirely — the group button links straight to
        // that single item instead of hiding it behind a dropdown.
        const isSingleItem = group.items.length === 1;
        const onlyItem = group.items[0];
        const isSingleItemActive =
          isSingleItem &&
          (pathname === onlyItem.href ||
            (onlyItem.href !== "/dashboard" && pathname?.startsWith(onlyItem.href)));

        if (isSingleItem) {
          return (
            <div key={group.label} className={classNames(idx !== 0 && "mt-1")}>
              {showManagementLabel && (
                <p className="px-3 pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                  Management
                </p>
              )}
              <Link
                href={onlyItem.href}
                onClick={() => setDrawerOpen(false)}
                data-active-link={isSingleItemActive ? "true" : undefined}
                className={classNames(
                  "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13.5px] font-semibold transition-colors select-none",
                  isSingleItemActive
                    ? "bg-primary/[0.07] text-primary"
                    : "text-text-secondary hover:bg-surface-hover"
                )}
              >
                <span
                  className={classNames(
                    "flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors",
                    isSingleItemActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface border border-border text-text-secondary"
                  )}
                >
                  <GroupIcon size={15} strokeWidth={2} />
                </span>
                <span className="truncate">{onlyItem.label}</span>
              </Link>
            </div>
          );
        }

        return (
          <div key={group.label} className={classNames(idx !== 0 && "mt-1")}>
            {showManagementLabel && (
              <p className="px-3 pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-text-muted">
                Management
              </p>
            )}
            <div
              className={classNames(
                "rounded-xl transition-colors duration-150",
                isOpen && "bg-primary/[0.07]"
              )}
            >
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                aria-expanded={isOpen}
                className={classNames(
                  "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-[13.5px] font-semibold transition-colors select-none",
                  isOpen
                    ? "text-primary"
                    : "text-text-secondary hover:bg-surface-hover"
                )}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={classNames(
                      "flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-colors",
                      isOpen
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface border border-border text-text-secondary"
                    )}
                  >
                    <GroupIcon size={15} strokeWidth={2} />
                  </span>
                  <span className="truncate">{group.label}</span>
                </span>
                <ChevronDown
                  size={15}
                  className={classNames(
                    "transition-transform duration-200 shrink-0",
                    isOpen ? "rotate-180 text-primary" : "text-text-muted rotate-0"
                  )}
                />
              </button>
              {isOpen && (
                <div className="mt-1 mb-1.5 mx-1 p-1.5 rounded-xl bg-surface border border-border shadow-lg shadow-black/[0.06] space-y-0.5">
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
                        data-active-link={isActive ? "true" : undefined}
                        className={classNames(
                          "flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150 select-none relative",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-text-secondary hover:bg-surface-hover"
                        )}
                      >
                        <Icon
                          size={15.5}
                          strokeWidth={isActive ? 2 : 1.75}
                          className={classNames(
                            "shrink-0",
                            isActive ? "text-primary-foreground" : "text-text-muted"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );

  const UserFooter = () =>
    user ? (
      <div className="px-4 py-4 mt-2 border-t border-border">
        <div className="w-full flex items-center gap-3 rounded-xl px-1 py-1">
          {/* Left: avatar + name → goes to profile */}
          <button
            className="flex items-center gap-3 flex-1 min-w-0 hover:bg-surface-hover rounded-xl transition-colors"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover shrink-0 border border-border"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border border-primary-light bg-primary-light/20"
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
                className="text-[13px] font-semibold truncate text-text"
              >
                {displayName}
              </p>
              <p className="text-[11.5px] text-text-muted truncate">
                {user?.email || ""}
              </p>
            </div>
          </button>

          {/* Logout button only */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={openLogoutModal}
              className="p-1 rounded-lg hover:bg-error-light/20 transition-colors group"
              title="Logout"
            >
              <ChevronRight
                size={15}
                className="text-text-muted group-hover:text-error transition-colors"
              />
            </button>
          </div>
        </div>
      </div>
    ) : null;

  const LogoMark = ({ small = false }: { small?: boolean }) => (
    <div className="flex items-center gap-2.5">
      <img
        src="/logo.jpeg"
        alt="Zyoris"
        className={classNames(
          "object-contain rounded-lg shrink-0",
          small ? "w-6 h-6" : "w-8 h-8"
        )}
      />
      <span
        className={classNames(
          "font-bold uppercase tracking-wider",
          small ? "text-sm" : "text-lg"
        )}
        style={{
          fontFamily: '"Neuropol X", "Neuropol X Free", sans-serif',
          color: "var(--color-primary)",
        }}
      >
        zyoris
      </span>
    </div>
  );

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden">

      {/* ── Desktop Sidebar (md and above) ── */}
      <aside className="hidden md:flex w-[220px] flex-col bg-surface border-r border-border shrink-0">
        <div className="px-5 pt-6 pb-5">
          <LogoMark />
        </div>
        <nav
          ref={sidebarNavRef}
          onScroll={handleSidebarScroll}
          className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto"
        >
          <NavLinks />
        </nav>
        <UserFooter />
      </aside>

      {/* ── Mobile Drawer (below md) ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop with smooth animation */}
          <div
            className="absolute inset-0 bg-black/50 transition-opacity duration-300"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel with smooth slide animation */}
          <aside className="absolute top-0 left-0 bottom-0 w-[280px] bg-surface flex flex-col shadow-2xl z-50 transition-transform duration-300 ease-out border-r border-border">
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <LogoMark />
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-surface-hover transition-colors"
                aria-label="Close menu"
              >
                <X size={18} className="text-text-secondary" />
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
        <header className="flex items-center gap-4 px-4 md:px-6 py-3 bg-surface border-b border-border shrink-0">
          {/* Mobile menu button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-1.5 rounded-xl hover:bg-surface-hover transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} className="text-text" />
          </button>

          {/* Mobile logo */}
          <div className="md:hidden">
            <LogoMark small />
          </div>

          {/* Search component */}
          <div className="flex-1 flex justify-start">
            <CrmSearch />
          </div>

          {/* Notification bell — single instance for both mobile & desktop */}
          <NotificationBell />
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