"use client";

import { AppShell } from "@/components/Shell";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading, token } = useAuth();
    const router = useRouter();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isLoading && (!user || !token)) {
            router.replace("/login");
        }
    }, [user, isLoading, token, router]);

    if (isLoading) {
        return (
            <div className="h-screen w-screen bg-[#f5f7fb] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Only render the shell if we have a user
    if (!user) return null;

    return <AppShell>{children}</AppShell>;
}