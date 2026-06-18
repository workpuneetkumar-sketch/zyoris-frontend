"use client";

import { AppShell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isInitializing } = useAuth();
    const router = useRouter();

    // Redirect to login immediately if not authenticated
    useEffect(() => {
        // If not initializing and not authenticated, redirect right away
        if (!isInitializing) {
            if (!isAuthenticated) {
                router.replace("/login");
            }
        }
    }, [isAuthenticated, isInitializing, router]);

    if (isInitializing) {
        return (
            <div className="h-screen w-screen bg-[#f5f7fb] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Only render the shell if we are authenticated
    if (!isAuthenticated) return null;

    return <AppShell>{children}</AppShell>;
}