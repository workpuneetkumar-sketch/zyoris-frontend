"use client";

import { AppShell } from "../Shell";
import { useState, useRef } from "react";
import {
    User,
    Settings,
    Shield,
    Bell,
    Sliders,
    KeyRound,
    CreditCard,
    Camera,
} from "lucide-react";
import api from "@/lib/api";
import { LucideIcon } from "lucide-react";

export interface Profile {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
    updatedAt: string;
}

export interface SettingsUIProps {
    profile: Profile | null;
    fallback: {
        email: string;
        name: string;
        role: string;
    };
}

const SETTINGS_NAV: { label: string; icon: LucideIcon }[] = [
    { label: "Profile", icon: User },
    { label: "Account", icon: Settings },
    { label: "Security", icon: Shield },
    { label: "Notifications", icon: Bell },
    { label: "Preferences", icon: Sliders },
    { label: "API Keys", icon: KeyRound },
    { label: "Billing", icon: CreditCard },
];

export default function SettingsUI({ profile, fallback }: SettingsUIProps) {
    const [activeTab, setActiveTab] = useState("Profile");
    const [name, setName] = useState(profile?.name ?? fallback.name);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const email = profile?.email ?? fallback.email;
    const role = profile?.role ?? fallback.role;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const initials = name
        .split(" ")
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveSuccess(false);
        setSaveError(null);
        try {
            if (photoFile) {
                const formData = new FormData();
                formData.append("name", name);
                formData.append("photo", photoFile);
                await api.patch("/auth/me", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
            } else {
                await api.patch("/auth/me", { name });
            }
            setSaveSuccess(true);
        } catch (e: any) {
            setSaveError(e?.response?.data?.message ?? "Failed to save. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <AppShell>
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                    Manage your account and preferences.
                </p>
            </div>

            <div className="flex gap-6">
                {/* ── Left Nav ── */}
                <aside className="w-48 shrink-0">
                    <nav className="flex flex-col gap-0.5">
                        {SETTINGS_NAV.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.label;
                            return (
                                <button
                                    key={item.label}
                                    onClick={() => setActiveTab(item.label)}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${isActive
                                            ? "bg-blue-50 text-blue-600"
                                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                                        }`}
                                >
                                    <Icon size={16} className={isActive ? "text-blue-500" : "text-gray-400"} />
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* ── Right Content ── */}
                <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm p-6">

                    {activeTab === "Profile" && (
                        <ProfileTab
                            name={name}
                            email={email}
                            role={role}
                            initials={initials}
                            photoPreview={photoPreview}
                            saving={saving}
                            saveSuccess={saveSuccess}
                            saveError={saveError}
                            fileInputRef={fileInputRef}
                            onNameChange={setName}
                            onPhotoChange={handlePhotoChange}
                            onSave={handleSave}
                        />
                    )}

                    {activeTab === "Account" && <AccountTab />}
                    {activeTab === "Security" && <SecurityTab />}
                    {activeTab === "Notifications" && <NotificationsTab />}

                    {!["Profile", "Account", "Security", "Notifications"].includes(activeTab) && (
                        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                            {activeTab} settings coming soon.
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}


// ─────────────────────────────────────────
// Tab Components
// ─────────────────────────────────────────

interface ProfileTabProps {
    name: string;
    email: string;
    role: string;
    initials: string;
    photoPreview: string | null;
    saving: boolean;
    saveSuccess: boolean;
    saveError: string | null;
    fileInputRef: React.RefObject<HTMLInputElement>;
    onNameChange: (val: string) => void;
    onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSave: () => void;
}

function ProfileTab({
    name, email, role, initials, photoPreview,
    saving, saveSuccess, saveError,
    fileInputRef, onNameChange, onPhotoChange, onSave,
}: ProfileTabProps) {
    return (
        <div>
            <h2 className="text-base font-semibold text-gray-900 mb-5">
                Profile Information
            </h2>

            {/* Avatar */}
            <div className="mb-6">
                <p className="text-sm text-gray-500 mb-3">Profile Picture</p>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        {photoPreview ? (
                            <img src={photoPreview} alt="Preview" className="w-16 h-16 rounded-full object-cover" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold">
                                {initials}
                            </div>
                        )}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                        >
                            <Camera size={11} className="text-white" />
                        </button>
                    </div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Change Photo
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onPhotoChange}
                    />
                </div>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-4 max-w-md">
                <div>
                    <label className="block text-sm text-gray-500 mb-1.5">Full Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => onNameChange(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-500 mb-1.5">
                        Email
                        <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Read only</span>
                    </label>
                    <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
                    />
                </div>

                <div>
                    <label className="block text-sm text-gray-500 mb-1.5">
                        Role
                        <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Read only</span>
                    </label>
                    <input
                        type="text"
                        value={role.replace(/_/g, " ")}
                        disabled
                        className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed"
                    />
                </div>

                {saveSuccess && (
                    <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                        ✓ Profile updated successfully.
                    </p>
                )}
                {saveError && (
                    <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                        {saveError}
                    </p>
                )}

                <div className="pt-2">
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-blue-200"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function AccountTab() {
    return (
        <div>
            <h2 className="text-base font-semibold text-gray-900 mb-5">Account</h2>
            <div className="flex flex-col gap-4 max-w-md">
                <div className="p-4 border border-red-100 bg-red-50 rounded-lg">
                    <p className="text-sm font-semibold text-red-600 mb-1">Delete Account</p>
                    <p className="text-xs text-red-400 mb-3">
                        Once deleted, your account cannot be recovered.
                    </p>
                    <button className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                        Delete my account
                    </button>
                </div>
            </div>
        </div>
    );
}

function SecurityTab() {
    return (
        <div>
            <h2 className="text-base font-semibold text-gray-900 mb-5">Security</h2>
            <div className="flex flex-col gap-4 max-w-md">
                {["Current Password", "New Password", "Confirm New Password"].map((label) => (
                    <div key={label}>
                        <label className="block text-sm text-gray-500 mb-1.5">{label}</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                        />
                    </div>
                ))}
                <div className="pt-2">
                    <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-blue-200">
                        Update Password
                    </button>
                </div>
            </div>
        </div>
    );
}

function NotificationsTab() {
    const items = [
        { label: "Email notifications", desc: "Receive updates via email" },
        { label: "Dashboard alerts", desc: "Show alerts inside the app" },
        { label: "Weekly digest", desc: "Get a weekly summary report" },
    ];
    return (
        <div>
            <h2 className="text-base font-semibold text-gray-900 mb-5">Notifications</h2>
            <div className="flex flex-col gap-4 max-w-md">
                {items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                        <div>
                            <p className="text-sm font-medium text-gray-700">{item.label}</p>
                            <p className="text-xs text-gray-400">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked className="sr-only peer" />
                            <div className="w-9 h-5 bg-gray-200 peer-checked:bg-blue-600 rounded-full transition-colors" />
                            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
}