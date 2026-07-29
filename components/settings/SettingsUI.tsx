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
  Building2,
  ChevronRight,
  BadgeCheck,
  FileText,
  MapPin,
  Phone,
  Globe,
  Landmark,
  Hash,
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
  { label: "My Company", icon: Building2 },
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

            {activeTab === "My Company" && <MyCompanyTab />}
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

// ─────────────────────────────────────────────────────────────────────────────
// My Company Tab
// ─────────────────────────────────────────────────────────────────────────────

type CompanyType = "registered" | "unregistered" | null;
type CompanySection = "basic" | "address" | "contact" | "tax" | "bank";

interface CompanyFormData {
  companyName: string;
  legalName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  gstNumber: string;
  panNumber: string;
  cinNumber: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  businessType: string;
  incorporationDate: string;
  logo: string | null;
}

const EMPTY_FORM: CompanyFormData = {
  companyName: "",
  legalName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  phone: "",
  email: "",
  website: "",
  gstNumber: "",
  panNumber: "",
  cinNumber: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  accountHolderName: "",
  businessType: "",
  incorporationDate: "",
  logo: null,
};

const BUSINESS_TYPES = [
  "Sole Proprietorship",
  "Partnership Firm",
  "Limited Liability Partnership (LLP)",
  "Private Limited Company",
  "Public Limited Company",
  "One Person Company (OPC)",
  "Section 8 Company (NGO)",
  "Hindu Undivided Family (HUF)",
  "Trust / Society",
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman & Nicobar Islands", "Chandigarh", "Dadra & Nagar Haveli and Daman & Diu",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

function MyCompanyTab() {
  const [companyType, setCompanyType] = useState<CompanyType>(null);
  const [activeSection, setActiveSection] = useState<CompanySection>("basic");
  const [form, setForm] = useState<CompanyFormData>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const STORAGE_KEY_REG = "zyoris-company-registered";
  const STORAGE_KEY_UNREG = "zyoris-company-unregistered";

  useEffect(() => {
    if (!companyType) return;
    const key = companyType === "registered" ? STORAGE_KEY_REG : STORAGE_KEY_UNREG;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setForm(parsed);
        setLogoPreview(parsed.logo ?? null);
      } catch {}
    } else {
      setForm(EMPTY_FORM);
      setLogoPreview(null);
    }
    setIsEditing(false);
    setActiveSection("basic");
  }, [companyType]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setForm((prev) => ({ ...prev, logo: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    const key = companyType === "registered" ? STORAGE_KEY_REG : STORAGE_KEY_UNREG;
    localStorage.setItem(key, JSON.stringify(form));
    setSaving(false);
    setIsEditing(false);
    toast.success("Company details saved successfully!");
  };

  const handleCancel = () => {
    const key = companyType === "registered" ? STORAGE_KEY_REG : STORAGE_KEY_UNREG;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setForm(parsed);
        setLogoPreview(parsed.logo ?? null);
      } catch {}
    } else {
      setForm(EMPTY_FORM);
      setLogoPreview(null);
    }
    setIsEditing(false);
  };

  const handleFieldChange = (key: keyof CompanyFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // ── Selection screen ──────────────────────────────────────────────────────
  if (!companyType) {
    return (
      <div>
        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Building2 size={18} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">My Company</h2>
          </div>
          <p className="text-sm text-gray-500 ml-12">Set up your company profile for invoicing, compliance &amp; branding.</p>
        </div>

        {/* Type selection cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
          {/* Registered */}
          <button
            id="company-type-registered"
            onClick={() => setCompanyType("registered")}
            className="group text-left relative overflow-hidden rounded-2xl border-2 border-transparent shadow-md hover:shadow-xl transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)",
              borderColor: "#bfdbfe",
            }}
          >
            {/* Decorative blob */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <BadgeCheck size={22} className="text-white" />
                </div>
                <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center group-hover:bg-blue-500 transition-all duration-200">
                  <ChevronRight size={16} className="text-blue-400 group-hover:text-white transition-colors" />
                </div>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Registered Company</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                GST registered business with full legal &amp; tax compliance details.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["GST", "PAN", "CIN", "Bank"].map((tag) => (
                  <span key={tag} className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">{tag}</span>
                ))}
              </div>
            </div>
          </button>

          {/* Unregistered */}
          <button
            id="company-type-unregistered"
            onClick={() => setCompanyType("unregistered")}
            className="group text-left relative overflow-hidden rounded-2xl border-2 border-transparent shadow-md hover:shadow-xl transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)",
              borderColor: "#fcd34d",
            }}
          >
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #f59e0b, transparent)" }} />
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <Building2 size={22} className="text-white" />
                </div>
                <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center group-hover:bg-amber-500 transition-all duration-200">
                  <ChevronRight size={16} className="text-amber-400 group-hover:text-white transition-colors" />
                </div>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Unregistered Business</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                Freelancer or small business without GST — enter only the basics.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["No GST", "Basic Info", "Bank"].map((tag) => (
                  <span key={tag} className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">{tag}</span>
                ))}
              </div>
            </div>
          </button>
        </div>

        {/* Info strip */}
        <div className="mt-8 max-w-2xl flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[10px] font-bold">i</span>
          </div>
          <p className="text-xs text-blue-700 leading-relaxed">
            Your company details are stored securely and used for invoices, letterheads, and compliance reports. You can update these anytime.
          </p>
        </div>
      </div>
    );
  }

  const isRegistered = companyType === "registered";

  const SECTION_NAV: { id: CompanySection; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: "basic",   label: "Basic Info",     icon: <Building2 size={14} />,  show: true },
    { id: "address", label: "Address",        icon: <MapPin size={14} />,     show: true },
    { id: "contact", label: "Contact",        icon: <Phone size={14} />,      show: true },
    { id: "tax",     label: "Tax & Legal",    icon: <FileText size={14} />,   show: true },
    { id: "bank",    label: "Bank Details",   icon: <Landmark size={14} />,   show: true },
  ];

  return (
    <div>
      {/* ── Premium Banner Header ── */}
      <div
        className="relative overflow-hidden rounded-2xl mb-6 shadow-lg"
        style={{
          background: isRegistered
            ? "linear-gradient(135deg, #1d4ed8 0%, #4f46e5 50%, #7c3aed 100%)"
            : "linear-gradient(135deg, #d97706 0%, #ea580c 50%, #dc2626 100%)",
        }}
      >
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white opacity-5" />
        <div className="absolute -bottom-10 -left-10 w-52 h-52 rounded-full bg-white opacity-5" />
        <div className="absolute top-4 right-20 w-16 h-16 rounded-full bg-white opacity-5" />

        <div className="relative flex items-center justify-between p-5">
          <div className="flex items-center gap-4">
            {/* Logo in header */}
            <div className="relative">
              <div
                className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center overflow-hidden shadow-xl cursor-pointer"
                onClick={isEditing ? () => logoRef.current?.click() : undefined}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <Building2 size={28} className="text-white/80" />
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => logoRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                >
                  <Camera size={11} className="text-gray-700" />
                </button>
              )}
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>

            {/* Company name & badge */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-white">
                  {form.companyName || "Your Company"}
                </h2>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    borderColor: "rgba(255,255,255,0.3)",
                    color: "white",
                  }}
                >
                  {isRegistered ? "GST Registered" : "Unregistered"}
                </span>
              </div>
              <p className="text-white/70 text-xs">
                {isRegistered
                  ? "Complete all sections for full tax compliance"
                  : "Fill in your basic business details"}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                id="company-edit-btn"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-semibold rounded-xl border border-white/30 transition-all duration-200 shadow-sm"
              >
                <Edit size={14} /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  id="company-cancel-btn"
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl border border-white/30 transition-all disabled:opacity-50"
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  id="company-save-btn"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-800 text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 transition-all duration-200 disabled:opacity-50"
                >
                  {saving ? (
                    <><Loader2 size={14} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Check size={14} className="text-green-600" /> Save</>
                  )}
                </button>
              </div>
            )}
            <button
              id="company-back-btn"
              onClick={() => setCompanyType(null)}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all border border-white/20"
              title="Change type"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Section Tab Nav ── */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {SECTION_NAV.filter(s => s.show).map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
              activeSection === s.id
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
            }`}
          >
            <span className={activeSection === s.id ? "text-blue-500" : "text-gray-400"}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Section Panels ── */}
      <div>
        {/* Basic Info */}
        {activeSection === "basic" && (
          <MCSection
            title="Basic Information"
            subtitle="Your company's core identity and registration details"
            icon={<Building2 size={16} />}
            color="blue"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MCField label="Company Name" required htmlFor="company-name">
                <MCInput id="company-name" placeholder="e.g. Acme Pvt Ltd" disabled={!isEditing}
                  value={form.companyName} onChange={handleFieldChange("companyName")} />
              </MCField>
              <MCField label="Legal / Trade Name" htmlFor="legal-name">
                <MCInput id="legal-name" placeholder="Full registered name" disabled={!isEditing}
                  value={form.legalName} onChange={handleFieldChange("legalName")} />
              </MCField>
              <MCField label="Business Type" htmlFor="business-type">
                <MCSelect id="business-type" disabled={!isEditing}
                  value={form.businessType} onChange={handleFieldChange("businessType")}>
                  <option value="">Select business type</option>
                  {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </MCSelect>
              </MCField>
              <MCField label="Incorporation Date" htmlFor="incorporation-date">
                <MCInput id="incorporation-date" type="date" disabled={!isEditing}
                  value={form.incorporationDate} onChange={handleFieldChange("incorporationDate")} />
              </MCField>
            </div>
          </MCSection>
        )}

        {/* Address */}
        {activeSection === "address" && (
          <MCSection
            title="Registered Address"
            subtitle="Official business address used in invoices and documents"
            icon={<MapPin size={16} />}
            color="green"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <MCField label="Address Line 1" htmlFor="address-line1">
                  <MCInput id="address-line1" placeholder="Street, Building, Floor" disabled={!isEditing}
                    value={form.addressLine1} onChange={handleFieldChange("addressLine1")} />
                </MCField>
              </div>
              <div className="md:col-span-2">
                <MCField label="Address Line 2" htmlFor="address-line2">
                  <MCInput id="address-line2" placeholder="Area, Landmark (optional)" disabled={!isEditing}
                    value={form.addressLine2} onChange={handleFieldChange("addressLine2")} />
                </MCField>
              </div>
              <MCField label="City" htmlFor="city">
                <MCInput id="city" placeholder="City" disabled={!isEditing}
                  value={form.city} onChange={handleFieldChange("city")} />
              </MCField>
              <MCField label="State" htmlFor="state">
                <MCSelect id="state" disabled={!isEditing}
                  value={form.state} onChange={handleFieldChange("state")}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </MCSelect>
              </MCField>
              <MCField label="Pincode" htmlFor="pincode">
                <MCInput id="pincode" placeholder="6-digit PIN" disabled={!isEditing} maxLength={6}
                  value={form.pincode} onChange={handleFieldChange("pincode")} />
              </MCField>
              <MCField label="Country" htmlFor="country">
                <MCInput id="country" placeholder="Country" disabled={!isEditing}
                  value={form.country} onChange={handleFieldChange("country")} />
              </MCField>
            </div>
          </MCSection>
        )}

        {/* Contact */}
        {activeSection === "contact" && (
          <MCSection
            title="Contact Details"
            subtitle="How clients and partners can reach your business"
            icon={<Phone size={16} />}
            color="purple"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MCField label="Phone Number" htmlFor="company-phone">
                <MCInput id="company-phone" placeholder="+91 98765 43210" disabled={!isEditing}
                  value={form.phone} onChange={handleFieldChange("phone")} />
              </MCField>
              <MCField label="Email Address" htmlFor="company-email">
                <MCInput id="company-email" type="email" placeholder="info@company.com" disabled={!isEditing}
                  value={form.email} onChange={handleFieldChange("email")} />
              </MCField>
              <div className="md:col-span-2">
                <MCField label="Website" htmlFor="company-website">
                  <MCInput id="company-website" placeholder="https://www.yourcompany.com" disabled={!isEditing}
                    value={form.website} onChange={handleFieldChange("website")} />
                </MCField>
              </div>
            </div>
          </MCSection>
        )}

        {/* Tax & Legal */}
        {activeSection === "tax" && (
          isRegistered ? (
            <MCSection
              title="Tax & Legal Details"
              subtitle="Required for GST compliance, e-invoicing, and audits"
              icon={<FileText size={16} />}
              color="red"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MCField label="GST Number" required htmlFor="gst-number">
                  <MCInput id="gst-number" placeholder="e.g. 22AAAAA0000A1Z5" disabled={!isEditing}
                    maxLength={15} style={{ textTransform: "uppercase" }}
                    value={form.gstNumber} onChange={handleFieldChange("gstNumber")} />
                </MCField>
                <MCField label="PAN Number" required htmlFor="pan-number">
                  <MCInput id="pan-number" placeholder="e.g. ABCDE1234F" disabled={!isEditing}
                    maxLength={10} style={{ textTransform: "uppercase" }}
                    value={form.panNumber} onChange={handleFieldChange("panNumber")} />
                </MCField>
                <MCField label="CIN Number" htmlFor="cin-number">
                  <MCInput id="cin-number" placeholder="e.g. U74999MH2010PTC123456" disabled={!isEditing}
                    style={{ textTransform: "uppercase" }}
                    value={form.cinNumber} onChange={handleFieldChange("cinNumber")} />
                </MCField>
              </div>
            </MCSection>
          ) : (
            <MCSection
              title="Legal Details"
              subtitle="Basic legal identifier for your business"
              icon={<Hash size={16} />}
              color="amber"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MCField label="PAN Number (Optional)" htmlFor="pan-number-unreg">
                  <MCInput id="pan-number-unreg" placeholder="e.g. ABCDE1234F" disabled={!isEditing}
                    maxLength={10} style={{ textTransform: "uppercase" }}
                    value={form.panNumber} onChange={handleFieldChange("panNumber")} />
                </MCField>
              </div>
              <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <BadgeCheck size={15} className="text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">No GST Number needed for unregistered businesses.</p>
              </div>
            </MCSection>
          )
        )}

        {/* Bank Details */}
        {activeSection === "bank" && (
          <MCSection
            title="Bank Details"
            subtitle="Used for payment processing and financial documents"
            icon={<Landmark size={16} />}
            color="indigo"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MCField label="Bank Name" htmlFor="bank-name">
                <MCInput id="bank-name" placeholder="e.g. State Bank of India" disabled={!isEditing}
                  value={form.bankName} onChange={handleFieldChange("bankName")} />
              </MCField>
              <MCField label="Account Holder Name" htmlFor="account-holder">
                <MCInput id="account-holder" placeholder="Name on account" disabled={!isEditing}
                  value={form.accountHolderName} onChange={handleFieldChange("accountHolderName")} />
              </MCField>
              <MCField label="Account Number" htmlFor="account-number">
                <MCInput id="account-number" placeholder="Bank account number" disabled={!isEditing}
                  value={form.accountNumber} onChange={handleFieldChange("accountNumber")} />
              </MCField>
              <MCField label="IFSC Code" htmlFor="ifsc-code">
                <MCInput id="ifsc-code" placeholder="e.g. SBIN0001234" disabled={!isEditing}
                  style={{ textTransform: "uppercase" }}
                  value={form.ifscCode} onChange={handleFieldChange("ifscCode")} />
              </MCField>
            </div>
          </MCSection>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Premium reusable helpers for MyCompanyTab
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-100",  icon: "bg-blue-100 text-blue-600",   text: "text-blue-700" },
  green:  { bg: "bg-green-50",  border: "border-green-100", icon: "bg-green-100 text-green-600", text: "text-green-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-100",icon: "bg-purple-100 text-purple-600",text: "text-purple-700" },
  red:    { bg: "bg-red-50",    border: "border-red-100",   icon: "bg-red-100 text-red-600",     text: "text-red-700" },
  amber:  { bg: "bg-amber-50",  border: "border-amber-100", icon: "bg-amber-100 text-amber-600", text: "text-amber-700" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-100",icon: "bg-indigo-100 text-indigo-600",text: "text-indigo-700" },
};

function MCSection({
  title,
  subtitle,
  icon,
  color = "blue",
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  children: React.ReactNode;
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} overflow-hidden`}>
      {/* Section header strip */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/60 bg-white/40">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
          {icon}
        </div>
        <div>
          <h3 className={`text-sm font-bold ${c.text}`}>{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function MCField({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function MCInput({
  disabled,
  className = "",
  style,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { disabled?: boolean }) {
  return (
    <input
      disabled={disabled}
      style={style}
      className={`w-full px-4 py-2.5 text-sm rounded-xl transition-all ${
        disabled
          ? "border border-gray-200 bg-white/70 text-gray-600 cursor-default shadow-none"
          : "border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 hover:border-gray-400"
      } ${className}`}
      {...props}
    />
  );
}

function MCSelect({
  disabled,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { disabled?: boolean }) {
  return (
    <select
      disabled={disabled}
      className={`w-full px-4 py-2.5 text-sm rounded-xl transition-all ${
        disabled
          ? "border border-gray-200 bg-white/70 text-gray-500 cursor-default"
          : "border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 hover:border-gray-400"
      }`}
      {...props}
    >
      {children}
    </select>
  );
}

// Keep old names as aliases so nothing else breaks
const MyCompanySection = MCSection;
const MyCompanyField = MCField;
const MyCompanyInput = MCInput;
const MyCompanySelect = MCSelect;
