"use client";

import { useState, useRef, useEffect } from "react";
import {
  User,
  Settings,
  Shield,
  Bell,
  MessageSquare,
  Sliders,
  KeyRound,
  CreditCard,
  Camera,
  Mail,
  Megaphone,
  ExternalLink,
  X,
  Check,
  Loader2,
  Edit,
} from "lucide-react";
import api from "@/lib/api/api";
import { toast } from "react-toastify";

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  organizationId?: string | null;
  organizationName?: string | null;
  designation?: string | null;
  department?: string | null;
}

export interface SettingsUIProps {
  profile: Profile | null;
  fallback: {
    email: string;
    name: string;
    role: string;
  };
}

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  whatsappNotifications: boolean;
  dailySummary: boolean;
  weeklyReport: boolean;
  marketingUpdates: boolean;
}

const STORAGE_KEY = "zyoris-notification-preferences";

const SETTINGS_NAV: { label: string; icon: any }[] = [
  { label: "Profile", icon: User },
  { label: "Account", icon: Settings },
  { label: "Security", icon: Shield },
  { label: "Notifications", icon: Bell },
  { label: "Templates", icon: MessageSquare },
];

export default function SettingsUI({ profile, fallback }: SettingsUIProps) {
  const [activeTab, setActiveTab] = useState("Profile");
  const [name, setName] = useState(profile?.name ?? fallback.name);
  const [originalName, setOriginalName] = useState(profile?.name ?? fallback.name);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    whatsappNotifications: true,
    dailySummary: true,
    weeklyReport: true,
    marketingUpdates: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load notification preferences from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setNotificationPrefs(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse notification preferences", e);
      }
    }
  }, []);

  // Update state when profile loads
  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setOriginalName(profile.name);
    }
  }, [profile]);

  const initials = (profile?.name ?? fallback.name)
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

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      // Since PATCH /auth/me doesn't exist yet, we'll simulate a successful save
      // In the future, when the backend endpoint is available, uncomment the code below
      
      // const formData = new FormData();
      // formData.append("name", name.trim());
      
      // if (photoFile) {
      //   formData.append("photo", photoFile);
      // }

      // await api.patch("/auth/me", formData, {
      //   headers: {
      //     // Let browser set Content-Type with boundary for FormData
      //   },
      // });

      // For now, just update the local state and show success
      setOriginalName(name.trim());
      setIsEditing(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      toast.success("Profile updated successfully! (Local only - backend endpoint coming soon)");
    } catch (e: any) {
      console.error("Save error:", e);
      toast.error(e?.response?.data?.message ?? "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(originalName);
    setPhotoPreview(null);
    setPhotoFile(null);
    setIsEditing(false);
  };

  const handleNotificationChange = (key: keyof NotificationPreferences, value: boolean) => {
    const newPrefs = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(newPrefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
    toast.success("Preference updated!");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account, preferences, and notifications
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Navigation */}
          <aside className="w-full lg:w-64 shrink-0">
            <nav className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 space-y-1">
              {SETTINGS_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.label;
                return (
                  <button
                    key={item.label}
                    onClick={() => setActiveTab(item.label)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={isActive ? "text-blue-500" : "text-gray-400"}
                    />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Right Content */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {activeTab === "Profile" && (
              <ProfileTab
                name={name}
                email={profile?.email ?? fallback.email}
                role={profile?.role ?? fallback.role}
                initials={initials}
                photoPreview={photoPreview}
                saving={saving}
                isEditing={isEditing}
                fileInputRef={fileInputRef}
                onNameChange={setName}
                onPhotoChange={handlePhotoChange}
                onSave={handleSaveProfile}
                onCancel={handleCancel}
                onEdit={() => setIsEditing(true)}
                profile={profile}
              />
            )}

            {activeTab === "Account" && (
              <AccountTab profile={profile} fallback={fallback} />
            )}

            {activeTab === "Security" && <SecurityTab />}

            {activeTab === "Notifications" && (
              <NotificationsTab
                prefs={notificationPrefs}
                onPrefChange={handleNotificationChange}
              />
            )}

            {activeTab === "Templates" && <TemplatesTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

// Profile Tab
interface ProfileTabProps {
  name: string;
  email: string;
  role: string;
  initials: string;
  photoPreview: string | null;
  saving: boolean;
  isEditing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onNameChange: (val: string) => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  profile: Profile | null;
}

function ProfileTab({
  name,
  email,
  role,
  initials,
  photoPreview,
  saving,
  isEditing,
  fileInputRef,
  onNameChange,
  onPhotoChange,
  onSave,
  onCancel,
  onEdit,
  profile,
}: ProfileTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
        {!isEditing && (
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Edit size={16} />
            Edit Profile
          </button>
        )}
      </div>

      {/* Avatar Section */}
      <div className="mb-8">
        <label className="text-sm font-medium text-gray-500 mb-4 block">
          Profile Picture
        </label>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-3xl font-bold text-white border-4 border-white shadow-lg overflow-hidden">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            {isEditing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors text-white shadow-md"
              >
                <Camera size={16} />
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPhotoChange}
            />
          </div>
          {isEditing && (
            <div className="space-y-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Change Photo
              </button>
              <p className="text-xs text-gray-400">
                JPG, PNG, GIF up to 10MB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-6 max-w-xl">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-500">Full Name</label>
          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          ) : (
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
              {name}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-500">
            Email Address
          </label>
          <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-500">
            {email}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-500">Role</label>
          <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-500">
            {role.replace(/_/g, " ")}
          </div>
        </div>

        {profile?.organizationName && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-500">
              Organization
            </label>
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-500">
              {profile.organizationName}
            </div>
          </div>
        )}

        {isEditing && (
          <div className="pt-6 border-t border-gray-200 flex items-center gap-3">
            <button
              onClick={onCancel}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Account Tab
interface AccountTabProps {
  profile: Profile | null;
  fallback: {
    email: string;
    name: string;
    role: string;
  };
}

function AccountTab({ profile, fallback }: AccountTabProps) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-8">Account</h2>

      <div className="space-y-6 max-w-xl">
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Account Details
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm text-gray-900 font-medium">
                {profile?.email ?? fallback.email}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Role</span>
              <span className="text-sm text-gray-900 font-medium">
                {(profile?.role ?? fallback.role).replace(/_/g, " ")}
              </span>
            </div>
            {profile?.organizationName && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Organization</span>
                <span className="text-sm text-gray-900 font-medium">
                  {profile.organizationName}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
          <h3 className="text-sm font-semibold text-red-700 mb-2">
            Delete Account
          </h3>
          <p className="text-xs text-red-500 mb-4">
            Once deleted, your account cannot be recovered. This action is
            permanent.
          </p>
          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
}

// Security Tab
function SecurityTab() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-8">Security</h2>

      <div className="space-y-6 max-w-xl">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-500">
            Current Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-500">
            New Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-500">
            Confirm New Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="pt-4">
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}

// Notifications Tab
interface NotificationsTabProps {
  prefs: NotificationPreferences;
  onPrefChange: (key: keyof NotificationPreferences, value: boolean) => void;
}

function NotificationsTab({ prefs, onPrefChange }: NotificationsTabProps) {
  const notificationItems: {
    key: keyof NotificationPreferences;
    label: string;
    desc: string;
  }[] = [
    {
      key: "emailNotifications",
      label: "Email Notifications",
      desc: "Receive updates and alerts via email",
    },
    {
      key: "pushNotifications",
      label: "Push Notifications",
      desc: "Show alerts within the application",
    },
    {
      key: "whatsappNotifications",
      label: "WhatsApp Notifications",
      desc: "Get updates on your WhatsApp number",
    },
    {
      key: "dailySummary",
      label: "Daily Summary",
      desc: "Receive a daily activity summary",
    },
    {
      key: "weeklyReport",
      label: "Weekly Report",
      desc: "Get a weekly performance report",
    },
    {
      key: "marketingUpdates",
      label: "Marketing Updates",
      desc: "Receive marketing and promotional emails",
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-8">Notifications</h2>

      <div className="space-y-4 max-w-xl">
        {notificationItems.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-200"
          >
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={prefs[item.key]}
                onChange={(e) => onPrefChange(item.key, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

// Templates Tab
function TemplatesTab() {
  const templates = [
    {
      title: "WhatsApp Templates",
      description: "Manage approved WhatsApp templates",
      icon: MessageSquare,
      path: "/whatsapp",
    },
    {
      title: "Email Templates",
      description: "Quick access to email workflows",
      icon: Mail,
      path: "/email",
    },
    {
      title: "Campaign Templates",
      description: "Marketing communication templates",
      icon: Megaphone,
      path: "/marketing/campaigns",
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-8">
        Communication Templates
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <a
              key={template.title}
              href={template.path}
              className="group p-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                  <Icon size={24} className="text-blue-600" />
                </div>
                <ExternalLink
                  size={18}
                  className="text-gray-400 group-hover:text-blue-500 transition-colors"
                />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {template.title}
              </h3>
              <p className="text-xs text-gray-500">{template.description}</p>
            </a>
          );
        })}
      </div>
    </div>
  );
}
