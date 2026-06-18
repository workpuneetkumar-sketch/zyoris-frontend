"use client";

import { useAuth } from "../../../context/AuthContext";
import api from "@/lib/api/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProfileUI from "../../../components/profile/ProfileUI";

interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const { user, isInitializing } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);

  // ✅ Auth guard with isInitializing
  useEffect(() => {
    if (isInitializing) return;
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
  }, [user, isInitializing, router]);

  if (isInitializing) return null;
  if (!user) return null;

  return (
    <ProfileUI
      profile={profile}
      fallback={{
        email: user.email,
        name: user.name,
        role: user.role,
      }}
    />
  );
}