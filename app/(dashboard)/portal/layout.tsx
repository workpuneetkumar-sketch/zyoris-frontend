"use client";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut, User, Loader2 } from "lucide-react";
import { getPortalProfile } from "@/lib/api/portalApi";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [clientName, setClientName] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  // null = still checking, true = OK, false = failed

  // 1️⃣ Verify token on mount and on every path change
  useEffect(() => {
    // No check needed on the login page itself
    if (pathname === "/portal/login") {
      setIsAuthenticated(true); // skip check
      return;
    }

    const tokenExists = !!localStorage.getItem("portalAuth");
    if (!tokenExists) {
      setIsAuthenticated(false);
      return;
    }

    // Call /portal/me to validate token
    getPortalProfile()
      .then((profile) => {
        setClientName(profile.name);
        setIsAuthenticated(true);
      })
      .catch(() => {
        // Token invalid/expired – clear and redirect
        localStorage.removeItem("portalAuth");
        setIsAuthenticated(false);
      });
  }, [pathname]);

  // 2️⃣ Redirect if authentication fails
  useEffect(() => {
    if (isAuthenticated === false && pathname !== "/portal/login") {
      router.replace("/portal/login");
    }
  }, [isAuthenticated, pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem("portalAuth");
    setIsAuthenticated(false);
    router.push("/portal/login");
  };

  // Render nothing while checking auth (or a full‑screen loader)
  if (pathname !== "/portal/login" && isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  // Login page is allowed without auth
  if (pathname === "/portal/login") {
    return <>{children}</>;
  }

  // If not authenticated (should be redirected by now, but safe fallback)
  if (!isAuthenticated) {
    return null;
  }

  // Normal authenticated layout
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/portal/dashboard" className="text-xl font-bold text-indigo-600 flex items-center gap-2">
            <User size={24} />
            Client Portal
          </Link>
          <div className="flex items-center gap-4">
            {clientName && (
              <span className="text-sm text-gray-600 hidden sm:block">
                Welcome, {clientName}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}