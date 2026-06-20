// app/portal/layout.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut, User } from "lucide-react";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [clientName, setClientName] = useState<string | null>(null);

  useEffect(() => {
    const portalData = localStorage.getItem("portalAuth");
    if (portalData) {
      try {
        const { client } = JSON.parse(portalData);
        setClientName(client?.name || null);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (pathname !== "/portal/login") {
      const portalData = localStorage.getItem("portalAuth");
      if (!portalData) {
        router.replace("/portal/login");
      }
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem("portalAuth");
    router.push("/portal/login");
  };

  if (pathname === "/portal/login") {
    return <>{children}</>;
  }

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
              <span className="text-sm text-gray-600 hidden sm:block">Welcome, {clientName}</span>
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