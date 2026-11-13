"use client";

import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SettingsUI, { Profile } from "@/components/settings/SettingsUI";

export default function SettingsPage() {
    const { user, isInitializing } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);

    useEffect(() => {
        if (isInitializing) return;
        if (!user) {
            router.replace("/login");
            return;
        }
        async function load() {
            try {
                const res = await api.get<any>("/auth/me");
                const data = res.data?.data || res.data;
                setProfile(data);
            } catch {
                // ignore for now
            }
        }
        load();
    }, [user, isInitializing, router]);

    if (isInitializing || !user) {
        return (
            <div className="flex items-center justify-center min-h-[350px]">
                <div
                    className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
                    role="status"
                    aria-label="Loading settings…"
                />
            </div>
        );
    }

    return (
        <SettingsUI
            profile={profile}
            fallback={{
                email: user.email,
                name: user.name,
                role: user.role,
            }}
        />
    );
}