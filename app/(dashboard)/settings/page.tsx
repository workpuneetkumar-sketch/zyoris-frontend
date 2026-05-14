"use client";

import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SettingsUI, { Profile } from "@/components/settings/SettingsUI";

export default function SettingsPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);

    useEffect(() => {
        if (isLoading) return;
        if (!user) {
            router.replace("/login");
            return;
        }
        async function load() {
            try {
                const res = await api.get<Profile>("/auth/me");
                setProfile(res.data);
            } catch {
                // ignore for now
            }
        }
        load();
    }, [user, isLoading, router]);

    if (isLoading) return null;
    if (!user) return null;

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