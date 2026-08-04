"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  User, Settings, Shield, Bell, MessageSquare, Building2,
  Camera, Mail, Megaphone, ExternalLink, X, Check, Loader2,
  Edit, ChevronRight, BadgeCheck, FileText, MapPin, Phone,
  Globe, Landmark, Hash, Sliders, RefreshCw, Trash2, Save,
  AlertCircle, CheckCircle2, Moon, Sun, Languages, Clock,
  CalendarDays,
} from "lucide-react";
import api from "@/lib/api/api";
import { toast } from "react-toastify";
import {
  fetchAllSettings,
  saveSetting,
  saveBoolSetting,
  deleteSetting,
  SettingsMap,
  patchNotificationPreferences,
} from "@/lib/api/settingsApi";
import {
  updateProfileApi,
  updatePasswordApi,
  deleteAccountApi,
} from "@/lib/api/authApi";
import {
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  getWhatsAppTemplates,
  createWhatsAppTemplate,
  updateWhatsAppTemplate,
  deleteWhatsAppTemplate,
  getCampaignTemplates,
  createCampaignTemplate,
  updateCampaignTemplate,
  deleteCampaignTemplate,
  EmailTemplate,
  WhatsAppTemplate,
  CampaignTemplate
} from "@/lib/api/templatesApi";


// ── Types ─────────────────────────────────────────────────────────────────────

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
  fallback: { email: string; name: string; role: string };
}

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  whatsappNotifications: boolean;
  dailySummary: boolean;
  weeklyReport: boolean;
  marketingUpdates: boolean;
}

// ── Settings key constants ────────────────────────────────────────────────────

const NOTIF_KEYS: Record<keyof NotificationPreferences, string> = {
  emailNotifications:    "notif.email",
  pushNotifications:     "notif.push",
  whatsappNotifications: "notif.whatsapp",
  dailySummary:          "notif.daily_summary",
  weeklyReport:          "notif.weekly_report",
  marketingUpdates:      "notif.marketing",
};

const PREF_KEYS = {
  theme:      "pref.theme",
  language:   "pref.language",
  timezone:   "pref.timezone",
  dateFormat: "pref.date_format",
  currency:   "pref.currency",
  timeFormat: "pref.time_format",
};

// ── Sidebar nav ───────────────────────────────────────────────────────────────

const SETTINGS_NAV: { label: string; icon: any }[] = [
  { label: "Profile",       icon: User },
  { label: "Account",       icon: Settings },
  { label: "Security",      icon: Shield },
  { label: "Notifications", icon: Bell },
  { label: "Preferences",   icon: Sliders },
  { label: "Templates",     icon: MessageSquare },
  { label: "My Company",    icon: Building2 },
];

// ── Default values ────────────────────────────────────────────────────────────

const DEFAULT_NOTIFS: NotificationPreferences = {
  emailNotifications:    true,
  pushNotifications:     true,
  whatsappNotifications: true,
  dailySummary:          true,
  weeklyReport:          true,
  marketingUpdates:      false,
};

const DEFAULT_PREFS = {
  theme:      "light",
  language:   "en",
  timezone:   "Asia/Kolkata",
  dateFormat: "DD/MM/YYYY",
  currency:   "INR",
  timeFormat: "12h",
};

// ── Main component ────────────────────────────────────────────────────────────

export default function SettingsUI({ profile, fallback }: SettingsUIProps) {
  const [activeTab, setActiveTab]           = useState("Profile");
  const [name, setName]                     = useState(profile?.name ?? fallback.name);
  const [originalName, setOriginalName]     = useState(profile?.name ?? fallback.name);
  const [designation, setDesignation]       = useState(profile?.designation ?? "");
  const [originalDesignation, setOriginalDesignation] = useState(profile?.designation ?? "");
  const [photoPreview, setPhotoPreview]     = useState<string | null>(null);
  const [photoFile, setPhotoFile]           = useState<File | null>(null);
  // URL returned by server after a successful upload – persists as the profile pic
  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>((profile as any)?.avatarUrl ?? null);
  const [saving, setSaving]                 = useState(false);
  const [isEditing, setIsEditing]           = useState(false);

  // Settings API state
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError,   setSettingsError]   = useState<string | null>(null);
  const [remoteSettings,  setRemoteSettings]  = useState<SettingsMap>({});

  // Notification prefs (driven by remoteSettings)
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFS);
  const [savingNotifKey, setSavingNotifKey]       = useState<string | null>(null);

  // App preferences (driven by remoteSettings)
  const [prefs, setPrefs]         = useState(DEFAULT_PREFS);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsModified, setPrefsModified] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load all settings from API on mount ──────────────────────────────────
  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const map = await fetchAllSettings();
      setRemoteSettings(map);

      // Hydrate notification prefs
      const hydrated: NotificationPreferences = { ...DEFAULT_NOTIFS };
      (Object.keys(NOTIF_KEYS) as (keyof NotificationPreferences)[]).forEach((k) => {
        const apiKey = NOTIF_KEYS[k];
        if (apiKey in map) hydrated[k] = map[apiKey] === "true";
      });
      setNotificationPrefs(hydrated);

      // Hydrate app prefs
      const hydratedPrefs = { ...DEFAULT_PREFS };
      (Object.keys(PREF_KEYS) as (keyof typeof PREF_KEYS)[]).forEach((k) => {
        const apiKey = PREF_KEYS[k];
        if (apiKey in map) (hydratedPrefs as any)[k] = map[apiKey];
      });
      setPrefs(hydratedPrefs);
    } catch (err: any) {
      console.warn("Failed to load settings:", err);
      setSettingsError("Could not load settings from server. Showing defaults.");
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // Sync name & designation from profile
  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setOriginalName(profile.name);
      setDesignation(profile.designation ?? "");
      setOriginalDesignation(profile.designation ?? "");
      if ((profile as any).avatarUrl) setSavedAvatarUrl((profile as any).avatarUrl);
    }
  }, [profile]);

  const initials = (profile?.name ?? fallback.name)
    .split(" ").map((p) => p[0]?.toUpperCase() ?? "").join("").slice(0, 2);

  // ── Profile handlers ──────────────────────────────────────────────────────
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) { toast.error("Name cannot be empty"); return; }
    setSaving(true);
    try {
      // Persist name and designation via settings API keys
      await saveSetting("profile.name", name.trim());
      if (designation.trim()) {
        await saveSetting("profile.designation", designation.trim());
      }

      // PATCH /auth/me – sends multipart/form-data when a photo file is selected
      // so the avatar binary reaches the backend; otherwise sends plain JSON.
      const updated = await updateProfileApi({
        name: name.trim(),
        designation: designation.trim() || undefined,
        avatarFile: photoFile ?? undefined,
      });

      // Capture the avatar URL returned by the server so the circle stays updated
      if (updated?.avatarUrl) {
        setSavedAvatarUrl(updated.avatarUrl);
      } else if (photoPreview) {
        // Fallback: keep the local object-URL preview visible
        setSavedAvatarUrl(photoPreview);
      }

      setOriginalName(name.trim());
      setOriginalDesignation(designation.trim());
      setIsEditing(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      toast.success("Profile updated successfully!");
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(originalName);
    setDesignation(originalDesignation);
    setPhotoPreview(null);
    setPhotoFile(null);
    setIsEditing(false);
  };

  // ── Notification toggle handler (calls PATCH /settings/notification-preferences) ─
  const handleNotificationChange = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    const apiKey = NOTIF_KEYS[key];
    setSavingNotifKey(apiKey);
    // Optimistic update
    setNotificationPrefs((prev) => ({ ...prev, [key]: value }));
    try {
      await patchNotificationPreferences({ [apiKey]: value });
      setRemoteSettings((prev) => ({ ...prev, [apiKey]: String(value) }));
      toast.success(`${value ? "Enabled" : "Disabled"} successfully`);
    } catch (err: any) {
      // Rollback
      setNotificationPrefs((prev) => ({ ...prev, [key]: !value }));
      toast.error(err?.response?.data?.message ?? "Failed to update preference");
    } finally {
      setSavingNotifKey(null);
    }
  };

  // ── App preferences save (batch PUT) ────────────────────────────────────
  const handleSavePrefs = async () => {
    setPrefsSaving(true);
    try {
      await Promise.all(
        (Object.keys(PREF_KEYS) as (keyof typeof PREF_KEYS)[]).map((k) =>
          saveSetting(PREF_KEYS[k], (prefs as any)[k])
        )
      );
      setPrefsModified(false);
      toast.success("Preferences saved!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save preferences");
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleDeleteSetting = async (key: string) => {
    try {
      await deleteSetting(key);
      setRemoteSettings((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast.success(`Setting "${key}" reset to default`);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        toast.info("Setting not found (already at default)");
      } else {
        toast.error("Failed to delete setting");
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your account, preferences, and notifications</p>
        </div>

        {/* Global settings error banner */}
        {settingsError && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span className="flex-1">{settingsError}</span>
            <button onClick={loadSettings} className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 shrink-0">
            <nav className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 space-y-1">
              {SETTINGS_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.label;
                return (
                  <button key={item.label} onClick={() => setActiveTab(item.label)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all w-full text-left ${
                      isActive ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={18} className={isActive ? "text-blue-500" : "text-gray-400"} />
                    {item.label}
                    {item.label === "Notifications" && settingsLoading && (
                      <Loader2 size={12} className="ml-auto animate-spin text-gray-300" />
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {activeTab === "Profile" && (
              <ProfileTab name={name} designation={designation} email={profile?.email ?? fallback.email}
                role={profile?.role ?? fallback.role} initials={initials}
                photoPreview={photoPreview} savedAvatarUrl={savedAvatarUrl} saving={saving} isEditing={isEditing}
                fileInputRef={fileInputRef} onNameChange={setName} onDesignationChange={setDesignation}
                onPhotoChange={handlePhotoChange} onSave={handleSaveProfile}
                onCancel={handleCancel} onEdit={() => setIsEditing(true)} profile={profile} />
            )}
            {activeTab === "Account"       && <AccountTab profile={profile} fallback={fallback} />}
            {activeTab === "Security"      && <SecurityTab />}
            {activeTab === "Notifications" && (
              <NotificationsTab prefs={notificationPrefs} loading={settingsLoading}
                savingKey={savingNotifKey} onPrefChange={handleNotificationChange}
                onDeleteSetting={handleDeleteSetting} />
            )}
            {activeTab === "Preferences"   && (
              <PreferencesTab prefs={prefs} loading={settingsLoading} saving={prefsSaving}
                modified={prefsModified}
                onChange={(k, v) => { setPrefs((p) => ({ ...p, [k]: v })); setPrefsModified(true); }}
                onSave={handleSavePrefs} onDelete={handleDeleteSetting} />
            )}
            {activeTab === "Templates"     && <TemplatesTab />}
            {activeTab === "My Company"    && <MyCompanyTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────

interface ProfileTabProps {
  name: string; designation: string; email: string; role: string; initials: string;
  photoPreview: string | null; savedAvatarUrl: string | null; saving: boolean; isEditing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onNameChange: (v: string) => void;
  onDesignationChange: (v: string) => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void; onCancel: () => void; onEdit: () => void;
  profile: Profile | null;
}

function ProfileTab({ name, designation, email, role, initials, photoPreview, savedAvatarUrl, saving, isEditing,
  fileInputRef, onNameChange, onDesignationChange, onPhotoChange, onSave, onCancel, onEdit, profile }: ProfileTabProps) {
  // Determine the image to display in the avatar circle:
  // 1. While editing – show the local file preview if user picked a new photo
  // 2. Otherwise (view mode or editing without a new pick) – show the server-saved avatar URL
  // 3. Fallback: initials
  const avatarSrc = photoPreview ?? savedAvatarUrl;
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
        {!isEditing && (
          <button onClick={onEdit}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Edit size={16} /> Edit Profile
          </button>
        )}
      </div>

      <div className="mb-8">
        <label className="text-sm font-medium text-gray-500 mb-4 block">Profile Picture</label>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-3xl font-bold text-white border-4 border-white shadow-lg overflow-hidden">
              {avatarSrc
                ? <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                : initials}
            </div>
            {isEditing && (
              <button onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors text-white shadow-md">
                <Camera size={16} />
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
          </div>
          {isEditing && (
            <div className="space-y-1">
              <button onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                Change Photo
              </button>
              <p className="text-xs text-gray-400">JPG, PNG, GIF up to 10MB</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6 max-w-xl">
        <FormField label="Full Name">
          {isEditing
            ? <input type="text" value={name} onChange={(e) => onNameChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
            : <ReadonlyField>{name}</ReadonlyField>}
        </FormField>
        <FormField label="Email Address"><ReadonlyField>{email}</ReadonlyField></FormField>
        <FormField label="Role"><ReadonlyField>{role.replace(/_/g, " ")}</ReadonlyField></FormField>
        {profile?.organizationName && (
          <FormField label="Organization"><ReadonlyField>{profile.organizationName}</ReadonlyField></FormField>
        )}
        <FormField label="Designation">
          {isEditing
            ? <input type="text" value={designation} onChange={(e) => onDesignationChange(e.target.value)}
                placeholder="e.g. Software Engineer"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
            : <ReadonlyField>{designation || "Not specified"}</ReadonlyField>}
        </FormField>
        {profile?.department && (
          <FormField label="Department"><ReadonlyField>{profile.department}</ReadonlyField></FormField>
        )}
        {isEditing && (
          <div className="pt-6 border-t border-gray-200 flex items-center gap-3">
            <button onClick={onCancel} disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
              <X size={16} /> Cancel
            </button>
            <button onClick={onSave} disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Check size={16} /> Save Changes</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Account Tab ───────────────────────────────────────────────────────────────

function AccountTab({ profile, fallback }: { profile: Profile | null; fallback: { email: string; name: string; role: string } }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmString, setConfirmString] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!password) {
      toast.error("Please enter your password");
      return;
    }
    if (confirmString !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }
    setDeleting(true);
    try {
      await deleteAccountApi({
        currentPassword: password,
        confirmation: "DELETE",
      });
      toast.success("Account deleted successfully");
      window.location.href = "/login";
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-8">Account</h2>
      <div className="space-y-6 max-w-xl">
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Account Details</h3>
          <div className="space-y-4">
            <DetailRow label="Email" value={profile?.email ?? fallback.email} />
            <DetailRow label="Role" value={(profile?.role ?? fallback.role).replace(/_/g, " ")} />
            {profile?.organizationName && <DetailRow label="Organization" value={profile.organizationName} />}
            {profile?.createdAt && (
              <DetailRow label="Member Since" value={new Date(profile.createdAt).toLocaleDateString()} />
            )}
          </div>
        </div>

        {!showConfirm ? (
          <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
            <h3 className="text-sm font-semibold text-red-700 mb-2">Delete Account</h3>
            <p className="text-xs text-red-500 mb-4">Once deleted, your account cannot be recovered. This action is permanent.</p>
            <button onClick={() => setShowConfirm(true)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
              Delete My Account
            </button>
          </div>
        ) : (
          <div className="bg-red-50 rounded-2xl p-6 border-2 border-red-500 space-y-4">
            <h3 className="text-sm font-bold text-red-700">Are you absolutely sure?</h3>
            <p className="text-xs text-red-600 leading-relaxed">
              This action is permanent and cannot be undone. Enter your current password and type <strong>DELETE</strong> in the box below to proceed.
            </p>
            <FormField label="Current Password">
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" />
            </FormField>
            <FormField label='Type "DELETE" to confirm'>
              <input type="text" placeholder="DELETE" value={confirmString} onChange={(e) => setConfirmString(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" />
            </FormField>
            <div className="flex items-center gap-3 pt-2">
              <button onClick={() => setShowConfirm(false)} disabled={deleting}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={deleting || confirmString !== "DELETE"}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
                {deleting ? "Deleting…" : "Permanently Delete Account"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Security Tab ──────────────────────────────────────────────────────────────

function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error("All fields are required");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await updatePasswordApi({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-8">Security</h2>
      <div className="space-y-6 max-w-xl">
        <FormField label="Current Password">
          <input type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
        </FormField>
        <FormField label="New Password">
          <input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
        </FormField>
        <FormField label="Confirm New Password">
          <input type="password" placeholder="••••••••" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
        </FormField>
        <div className="pt-4">
          <button onClick={handleUpdatePassword} disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Updating…</> : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Notifications Tab (API-integrated) ───────────────────────────────────────

interface NotificationsTabProps {
  prefs: NotificationPreferences;
  loading: boolean;
  savingKey: string | null;
  onPrefChange: (key: keyof NotificationPreferences, value: boolean) => Promise<void>;
  onDeleteSetting: (key: string) => Promise<void>;
}

const NOTIF_ITEMS: { key: keyof NotificationPreferences; apiKey: string; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: "emailNotifications",    apiKey: "notif.email",          label: "Email Notifications",     desc: "Receive updates and alerts via email",             icon: <Mail size={16} /> },
  { key: "pushNotifications",     apiKey: "notif.push",           label: "Push Notifications",      desc: "Show alerts within the application",               icon: <Bell size={16} /> },
  { key: "whatsappNotifications", apiKey: "notif.whatsapp",       label: "WhatsApp Notifications",  desc: "Get updates on your WhatsApp number",              icon: <MessageSquare size={16} /> },
  { key: "dailySummary",          apiKey: "notif.daily_summary",  label: "Daily Summary",           desc: "Receive a daily activity digest email",            icon: <CalendarDays size={16} /> },
  { key: "weeklyReport",          apiKey: "notif.weekly_report",  label: "Weekly Report",           desc: "Get a weekly performance and pipeline report",     icon: <FileText size={16} /> },
  { key: "marketingUpdates",      apiKey: "notif.marketing",      label: "Marketing Updates",       desc: "Receive marketing and promotional communications", icon: <Megaphone size={16} /> },
];

function NotificationsTab({ prefs, loading, savingKey, onPrefChange, onDeleteSetting }: NotificationsTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500 mt-0.5">Control how and when you get notified — saved instantly via API</p>
        </div>
        {loading && <Loader2 size={18} className="animate-spin text-blue-400" />}
      </div>

      <div className="space-y-3 max-w-xl">
        {NOTIF_ITEMS.map((item) => {
          const isSaving = savingKey === item.apiKey;
          const isOn     = prefs[item.key];
          return (
            <div key={item.key}
              className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${
                isOn ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3 flex-1 pr-4">
                <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isOn ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
                }`}>
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-1">key: {item.apiKey}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isSaving
                  ? <Loader2 size={18} className="animate-spin text-blue-400" />
                  : isOn
                    ? <CheckCircle2 size={14} className="text-blue-400" />
                    : null
                }
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={isOn}
                    onChange={(e) => onPrefChange(item.key, e.target.checked)}
                    disabled={loading || isSaving} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50" />
                </label>
                <button title="Reset to default"
                  onClick={() => onDeleteSetting(item.apiKey)}
                  disabled={loading || isSaving}
                  className="w-7 h-7 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-30">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-gray-400 flex items-center gap-1.5">
        <CheckCircle2 size={12} />
        Changes are persisted immediately via <code className="bg-gray-100 px-1 rounded text-[10px]">PATCH /settings/notification-preferences</code>
      </p>
    </div>
  );
}

// ── Preferences Tab (API-integrated) ─────────────────────────────────────────

interface PreferencesTabProps {
  prefs: typeof DEFAULT_PREFS;
  loading: boolean;
  saving: boolean;
  modified: boolean;
  onChange: (key: keyof typeof DEFAULT_PREFS, value: string) => void;
  onSave: () => Promise<void>;
  onDelete: (key: string) => Promise<void>;
}

const TIMEZONES = [
  "Asia/Kolkata", "UTC", "America/New_York", "America/Los_Angeles",
  "America/Chicago", "Europe/London", "Europe/Paris", "Asia/Tokyo",
  "Asia/Singapore", "Asia/Dubai", "Australia/Sydney",
];

const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "D MMM YYYY"];
const CURRENCIES   = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "JPY"];
const LANGUAGES    = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ar", label: "Arabic" },
];

function PreferencesTab({ prefs, loading, saving, modified, onChange, onSave, onDelete }: PreferencesTabProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">App Preferences</h2>
          <p className="text-sm text-gray-500 mt-0.5">Personalise your workspace experience</p>
        </div>
        {loading && <Loader2 size={18} className="animate-spin text-blue-400" />}
      </div>

      <div className="space-y-5 max-w-xl">
        {/* Theme */}
        <PrefCard label="Theme" apiKey={PREF_KEYS.theme} icon={<Sun size={16} />} onReset={onDelete}>
          <div className="flex gap-3">
            {[
              { value: "light", label: "Light", icon: <Sun size={15} /> },
              { value: "dark",  label: "Dark",  icon: <Moon size={15} /> },
              { value: "system",label: "System",icon: <Sliders size={15} /> },
            ].map((t) => (
              <button key={t.value} onClick={() => onChange("theme", t.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  prefs.theme === t.value
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                }`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </PrefCard>

        {/* Language */}
        <PrefCard label="Language" apiKey={PREF_KEYS.language} icon={<Languages size={16} />} onReset={onDelete}>
          <select value={prefs.language} onChange={(e) => onChange("language", e.target.value)}
            className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </PrefCard>

        {/* Timezone */}
        <PrefCard label="Timezone" apiKey={PREF_KEYS.timezone} icon={<Globe size={16} />} onReset={onDelete}>
          <select value={prefs.timezone} onChange={(e) => onChange("timezone", e.target.value)}
            className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </PrefCard>

        {/* Date format */}
        <PrefCard label="Date Format" apiKey={PREF_KEYS.dateFormat} icon={<CalendarDays size={16} />} onReset={onDelete}>
          <div className="flex flex-wrap gap-2">
            {DATE_FORMATS.map((f) => (
              <button key={f} onClick={() => onChange("dateFormat", f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all ${
                  prefs.dateFormat === f
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                }`}>{f}
              </button>
            ))}
          </div>
        </PrefCard>

        {/* Time format */}
        <PrefCard label="Time Format" apiKey={PREF_KEYS.timeFormat} icon={<Clock size={16} />} onReset={onDelete}>
          <div className="flex gap-3">
            {[{ value: "12h", label: "12-hour (AM/PM)" }, { value: "24h", label: "24-hour" }].map((t) => (
              <button key={t.value} onClick={() => onChange("timeFormat", t.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  prefs.timeFormat === t.value
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                }`}>{t.label}
              </button>
            ))}
          </div>
        </PrefCard>

        {/* Currency */}
        <PrefCard label="Currency" apiKey={PREF_KEYS.currency} icon={<Landmark size={16} />} onReset={onDelete}>
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map((c) => (
              <button key={c} onClick={() => onChange("currency", c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  prefs.currency === c
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                }`}>{c}
              </button>
            ))}
          </div>
        </PrefCard>
      </div>

      {/* Save button */}
      {modified && (
        <div className="mt-6 flex items-center gap-3">
          <button onClick={onSave} disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 shadow-sm shadow-blue-200 transition-all">
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Save size={16} /> Save Preferences</>}
          </button>
          <p className="text-xs text-gray-400">
            Saves via <code className="bg-gray-100 px-1 rounded">PUT /settings/{"{key}"}</code>
          </p>
        </div>
      )}
    </div>
  );
}

function PrefCard({ label, apiKey, icon, children, onReset }: {
  label: string; apiKey: string; icon: React.ReactNode; children: React.ReactNode;
  onReset: (key: string) => Promise<void>;
}) {
  return (
    <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-blue-500">{icon}</span>
          <span className="text-sm font-semibold text-gray-800">{label}</span>
          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{apiKey}</span>
        </div>
        <button onClick={() => onReset(apiKey)} title="Reset to default"
          className="w-6 h-6 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 flex items-center justify-center transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
      {children}
    </div>
  );
}

// ── Templates Tab ─────────────────────────────────────────────────────────────

function TemplatesTab() {
  const [subTab, setSubTab] = useState<"email" | "whatsapp" | "campaign">("email");
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<EmailTemplate[]>([]);
  const [whatsapps, setWhatsapps] = useState<WhatsAppTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignTemplate[]>([]);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [activeId, setActiveId] = useState<string | null>(null);

  // Form Fields
  // Email fields
  const [emailName, setEmailName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // WhatsApp fields
  const [waName, setWaName] = useState("");
  const [waBody, setWaBody] = useState("");
  const [waCategory, setWaCategory] = useState("MARKETING");
  const [waLanguage, setWaLanguage] = useState("en_US");
  const [waStatus, setWaStatus] = useState("DRAFT");

  // Campaign fields
  const [campName, setCampName] = useState("");
  const [campDesc, setCampDesc] = useState("");
  const [campChannel, setCampChannel] = useState("EMAIL");
  const [campBudget, setCampBudget] = useState<number>(0);
  const [campStatus, setCampStatus] = useState("DRAFT");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (subTab === "email") {
        const list = await getEmailTemplates();
        setEmails(list);
      } else if (subTab === "whatsapp") {
        const list = await getWhatsAppTemplates();
        setWhatsapps(list);
      } else if (subTab === "campaign") {
        const list = await getCampaignTemplates();
        setCampaigns(list);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to fetch templates");
    } finally {
      setLoading(false);
    }
  }, [subTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setModalMode("create");
    setActiveId(null);
    setEmailName("");
    setEmailSubject("");
    setEmailBody("");
    setWaName("");
    setWaBody("");
    setWaCategory("MARKETING");
    setWaLanguage("en_US");
    setWaStatus("DRAFT");
    setCampName("");
    setCampDesc("");
    setCampChannel("EMAIL");
    setCampBudget(0);
    setCampStatus("DRAFT");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setModalMode("edit");
    setActiveId(item.id);
    if (subTab === "email") {
      setEmailName(item.name || "");
      setEmailSubject(item.subject || "");
      setEmailBody(item.body || "");
    } else if (subTab === "whatsapp") {
      setWaName(item.name || "");
      setWaBody(item.body || "");
      setWaCategory(item.category || "MARKETING");
      setWaLanguage(item.language || "en_US");
      setWaStatus(item.status || "DRAFT");
    } else if (subTab === "campaign") {
      setCampName(item.name || "");
      setCampDesc(item.description || "");
      setCampChannel(item.channel || "EMAIL");
      setCampBudget(item.budget || 0);
      setCampStatus(item.status || "DRAFT");
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      if (subTab === "email") {
        await deleteEmailTemplate(id);
      } else if (subTab === "whatsapp") {
        await deleteWhatsAppTemplate(id);
      } else if (subTab === "campaign") {
        await deleteCampaignTemplate(id);
      }
      toast.success("Template deleted successfully");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to delete template");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (subTab === "email") {
        const payload = { name: emailName, subject: emailSubject, body: emailBody };
        if (modalMode === "create") {
          await createEmailTemplate(payload);
        } else {
          await updateEmailTemplate(activeId!, payload);
        }
      } else if (subTab === "whatsapp") {
        const payload = { name: waName, body: waBody, category: waCategory, language: waLanguage, status: waStatus };
        if (modalMode === "create") {
          await createWhatsAppTemplate(payload);
        } else {
          await updateWhatsAppTemplate(activeId!, payload);
        }
      } else if (subTab === "campaign") {
        const payload = { name: campName, description: campDesc, channel: campChannel, budget: Number(campBudget), status: campStatus };
        if (modalMode === "create") {
          await createCampaignTemplate(payload);
        } else {
          await updateCampaignTemplate(activeId!, payload);
        }
      }
      toast.success(`Template ${modalMode === "create" ? "created" : "updated"} successfully`);
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Communication Templates</h2>
          <p className="text-sm text-gray-500 mt-1">Manage and sync Email, WhatsApp, and Campaign templates</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm"
        >
          Create Template
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl max-w-md">
        {[
          { id: "email", label: "Email", icon: Mail },
          { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
          { id: "campaign", label: "Campaigns", icon: Megaphone },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Templates List */}
      <div className="bg-gray-50/50 rounded-2xl border border-gray-200 overflow-hidden">
        {loading && (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        )}

        {!loading && subTab === "email" && (
          emails.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No Email Templates found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-100/50 text-gray-600 font-semibold">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {emails.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{e.name}</td>
                      <td className="px-6 py-4 text-gray-500">{e.subject}</td>
                      <td className="px-6 py-4 flex gap-2">
                        <button onClick={() => handleOpenEdit(e)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                        <button onClick={() => handleDelete(e.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {!loading && subTab === "whatsapp" && (
          whatsapps.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No WhatsApp Templates found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-100/50 text-gray-600 font-semibold">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Language</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {whatsapps.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{w.name}</td>
                      <td className="px-6 py-4 text-gray-500">{w.category || "N/A"}</td>
                      <td className="px-6 py-4 text-gray-500 font-mono">{w.language || "N/A"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          w.status === "ACTIVE" || w.status === "APPROVED" ? "bg-green-100 text-green-800" :
                          w.status === "REJECTED" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {w.status || "DRAFT"}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <button onClick={() => handleOpenEdit(w)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                        <button onClick={() => handleDelete(w.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {!loading && subTab === "campaign" && (
          campaigns.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No Campaign Templates found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-100/50 text-gray-600 font-semibold">
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Channel</th>
                    <th className="px-6 py-4">Budget</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div>
                          <p className="font-semibold">{c.name}</p>
                          {c.description && <p className="text-xs text-gray-400">{c.description}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-semibold">{c.channel}</td>
                      <td className="px-6 py-4 text-gray-500 font-mono">${c.budget || 0}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          c.status === "ACTIVE" || c.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                          c.status === "PAUSED" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {c.status || "DRAFT"}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <button onClick={() => handleOpenEdit(c)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                        <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 font-medium">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Premium Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {modalMode === "create" ? "Create New" : "Edit"} {subTab === "email" ? "Email" : subTab === "whatsapp" ? "WhatsApp" : "Campaign"} Template
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {subTab === "email" && (
                <>
                  <FormField label="Template Name">
                    <input
                      type="text"
                      required
                      placeholder="e.g. welcome_email"
                      value={emailName}
                      onChange={(e) => setEmailName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    />
                  </FormField>
                  <FormField label="Subject Line">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Welcome to Zyoris!"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    />
                  </FormField>
                  <FormField label="Body HTML/Text">
                    <textarea
                      required
                      rows={5}
                      placeholder="Hi {{name}}, welcome to our platform!"
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-mono"
                    />
                  </FormField>
                </>
              )}

              {subTab === "whatsapp" && (
                <>
                  <FormField label="Template Name">
                    <input
                      type="text"
                      required
                      placeholder="e.g. welcome_template"
                      value={waName}
                      onChange={(e) => setWaName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    />
                  </FormField>
                  <FormField label="Category">
                    <select
                      value={waCategory}
                      onChange={(e) => setWaCategory(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    >
                      <option value="MARKETING">MARKETING</option>
                      <option value="UTILITY">UTILITY</option>
                      <option value="AUTHENTICATION">AUTHENTICATION</option>
                    </select>
                  </FormField>
                  <FormField label="Language Code">
                    <input
                      type="text"
                      placeholder="e.g. en_US"
                      value={waLanguage}
                      onChange={(e) => setWaLanguage(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    />
                  </FormField>
                  <FormField label="Status">
                    <select
                      value={waStatus}
                      onChange={(e) => setWaStatus(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="PENDING">PENDING</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </FormField>
                  <FormField label="Message Body">
                    <textarea
                      required
                      rows={4}
                      placeholder="Hi {{1}}, welcome to our service!"
                      value={waBody}
                      onChange={(e) => setWaBody(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm font-mono"
                    />
                  </FormField>
                </>
              )}

              {subTab === "campaign" && (
                <>
                  <FormField label="Campaign Name">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Summer Outreach"
                      value={campName}
                      onChange={(e) => setCampName(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    />
                  </FormField>
                  <FormField label="Description">
                    <input
                      type="text"
                      placeholder="Summary of campaign scope"
                      value={campDesc}
                      onChange={(e) => setCampDesc(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    />
                  </FormField>
                  <FormField label="Channel">
                    <select
                      value={campChannel}
                      onChange={(e) => setCampChannel(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    >
                      <option value="EMAIL">EMAIL</option>
                      <option value="WHATSAPP">WHATSAPP</option>
                      <option value="SMS">SMS</option>
                    </select>
                  </FormField>
                  <FormField label="Budget Limit ($)">
                    <input
                      type="number"
                      placeholder="0"
                      value={campBudget}
                      onChange={(e) => setCampBudget(Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    />
                  </FormField>
                  <FormField label="Status">
                    <select
                      value={campStatus}
                      onChange={(e) => setCampStatus(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="PAUSED">PAUSED</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>
                  </FormField>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
                >
                  {loading ? "Saving…" : "Save Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function ReadonlyField({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm">{children}</div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value}</span>
    </div>
  );
}

// ── My Company Tab (unchanged premium UI) ────────────────────────────────────

type CompanyType = "registered" | "unregistered" | null;
type CompanySection = "basic" | "address" | "contact" | "tax" | "bank";

interface CompanyFormData {
  companyName: string; legalName: string; addressLine1: string; addressLine2: string;
  city: string; state: string; pincode: string; country: string; phone: string;
  email: string; website: string; gstNumber: string; panNumber: string; cinNumber: string;
  bankName: string; accountNumber: string; ifscCode: string; accountHolderName: string;
  businessType: string; incorporationDate: string; logo: string | null;
}

const EMPTY_COMPANY_FORM: CompanyFormData = {
  companyName: "", legalName: "", addressLine1: "", addressLine2: "",
  city: "", state: "", pincode: "", country: "India", phone: "",
  email: "", website: "", gstNumber: "", panNumber: "", cinNumber: "",
  bankName: "", accountNumber: "", ifscCode: "", accountHolderName: "",
  businessType: "", incorporationDate: "", logo: null,
};

const BUSINESS_TYPES = [
  "Sole Proprietorship", "Partnership Firm", "Limited Liability Partnership (LLP)",
  "Private Limited Company", "Public Limited Company", "One Person Company (OPC)",
  "Section 8 Company (NGO)", "Hindu Undivided Family (HUF)", "Trust / Society",
];

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Andaman & Nicobar Islands","Chandigarh",
  "Dadra & Nagar Haveli and Daman & Diu","Delhi","Jammu & Kashmir","Ladakh",
  "Lakshadweep","Puducherry",
];

function MyCompanyTab() {
  const [companyType, setCompanyType] = useState<CompanyType>(null);
  const [activeSection, setActiveSection] = useState<CompanySection>("basic");
  const [form, setForm]       = useState<CompanyFormData>(EMPTY_COMPANY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const SK_REG   = "zyoris-company-registered";
  const SK_UNREG = "zyoris-company-unregistered";

  useEffect(() => {
    if (!companyType) return;
    const stored = localStorage.getItem(companyType === "registered" ? SK_REG : SK_UNREG);
    if (stored) { try { const p = JSON.parse(stored); setForm(p); setLogoPreview(p.logo ?? null); } catch {} }
    else { setForm(EMPTY_COMPANY_FORM); setLogoPreview(null); }
    setIsEditing(false); setActiveSection("basic");
  }, [companyType]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { const r = reader.result as string; setLogoPreview(r); setForm((p) => ({ ...p, logo: r })); };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) { toast.error("Company name is required."); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    localStorage.setItem(companyType === "registered" ? SK_REG : SK_UNREG, JSON.stringify(form));
    setSaving(false); setIsEditing(false);
    toast.success("Company details saved!");
  };

  const handleCancel = () => {
    const stored = localStorage.getItem(companyType === "registered" ? SK_REG : SK_UNREG);
    if (stored) { try { const p = JSON.parse(stored); setForm(p); setLogoPreview(p.logo ?? null); } catch {} }
    else { setForm(EMPTY_COMPANY_FORM); setLogoPreview(null); }
    setIsEditing(false);
  };

  const fc = (key: keyof CompanyFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  if (!companyType) {
    return (
      <div>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Building2 size={18} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">My Company</h2>
          </div>
          <p className="text-sm text-gray-500 ml-12">Set up your company profile for invoicing, compliance &amp; branding.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
          <button onClick={() => setCompanyType("registered")}
            className="group text-left relative overflow-hidden rounded-2xl border-2 shadow-md hover:shadow-xl transition-all duration-300"
            style={{ background: "linear-gradient(135deg,#eff6ff 0%,#e0e7ff 100%)", borderColor: "#bfdbfe" }}>
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20" style={{ background: "radial-gradient(circle,#3b82f6,transparent)" }} />
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <BadgeCheck size={22} className="text-white" />
                </div>
                <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center group-hover:bg-blue-500 transition-all">
                  <ChevronRight size={16} className="text-blue-400 group-hover:text-white transition-colors" />
                </div>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Registered Company</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">GST registered business with full legal &amp; tax compliance details.</p>
              <div className="flex flex-wrap gap-1.5">
                {["GST","PAN","CIN","Bank"].map((t) => (
                  <span key={t} className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">{t}</span>
                ))}
              </div>
            </div>
          </button>
          <button onClick={() => setCompanyType("unregistered")}
            className="group text-left relative overflow-hidden rounded-2xl border-2 shadow-md hover:shadow-xl transition-all duration-300"
            style={{ background: "linear-gradient(135deg,#fffbeb 0%,#fff7ed 100%)", borderColor: "#fcd34d" }}>
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20" style={{ background: "radial-gradient(circle,#f59e0b,transparent)" }} />
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Building2 size={22} className="text-white" />
                </div>
                <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center group-hover:bg-amber-500 transition-all">
                  <ChevronRight size={16} className="text-amber-400 group-hover:text-white transition-colors" />
                </div>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Unregistered Business</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">Freelancer or small business without GST — enter only the basics.</p>
              <div className="flex flex-wrap gap-1.5">
                {["No GST","Basic Info","Bank"].map((t) => (
                  <span key={t} className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">{t}</span>
                ))}
              </div>
            </div>
          </button>
        </div>
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

  const isReg = companyType === "registered";
  const SECTION_NAV: { id: CompanySection; label: string; icon: React.ReactNode }[] = [
    { id: "basic",   label: "Basic Info",  icon: <Building2 size={14} /> },
    { id: "address", label: "Address",     icon: <MapPin size={14} /> },
    { id: "contact", label: "Contact",     icon: <Phone size={14} /> },
    { id: "tax",     label: "Tax & Legal", icon: <FileText size={14} /> },
    { id: "bank",    label: "Bank Details",icon: <Landmark size={14} /> },
  ];

  return (
    <div>
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl mb-6 shadow-lg"
        style={{ background: isReg ? "linear-gradient(135deg,#1d4ed8 0%,#4f46e5 50%,#7c3aed 100%)" : "linear-gradient(135deg,#d97706 0%,#ea580c 50%,#dc2626 100%)" }}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white opacity-5" />
        <div className="absolute -bottom-10 -left-10 w-52 h-52 rounded-full bg-white opacity-5" />
        <div className="relative flex items-center justify-between p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center overflow-hidden shadow-xl cursor-pointer"
                onClick={isEditing ? () => logoRef.current?.click() : undefined}>
                {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" /> : <Building2 size={28} className="text-white/80" />}
              </div>
              {isEditing && (
                <button onClick={() => logoRef.current?.click()} className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                  <Camera size={11} className="text-gray-700" />
                </button>
              )}
              <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-white">{form.companyName || "Your Company"}</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)", color: "white", border: "1px solid" }}>
                  {isReg ? "GST Registered" : "Unregistered"}
                </span>
              </div>
              <p className="text-white/70 text-xs">{isReg ? "Complete all sections for full tax compliance" : "Fill in your basic business details"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-semibold rounded-xl border border-white/30 transition-all shadow-sm">
                <Edit size={14} /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={handleCancel} disabled={saving} className="inline-flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl border border-white/30 transition-all disabled:opacity-50">
                  <X size={14} /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-800 text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 transition-all disabled:opacity-50">
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Check size={14} className="text-green-600" /> Save</>}
                </button>
              </div>
            )}
            <button onClick={() => setCompanyType(null)} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all border border-white/20" title="Change type">
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {SECTION_NAV.map((s) => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
              activeSection === s.id ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
            }`}>
            <span className={activeSection === s.id ? "text-blue-500" : "text-gray-400"}>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      {activeSection === "basic" && (
        <MCSection title="Basic Information" subtitle="Your company's core identity and registration details" icon={<Building2 size={16} />} color="blue">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MCField label="Company Name" required htmlFor="cname"><MCInput id="cname" placeholder="e.g. Acme Pvt Ltd" disabled={!isEditing} value={form.companyName} onChange={fc("companyName")} /></MCField>
            <MCField label="Legal / Trade Name" htmlFor="lname"><MCInput id="lname" placeholder="Full registered name" disabled={!isEditing} value={form.legalName} onChange={fc("legalName")} /></MCField>
            <MCField label="Business Type" htmlFor="btype">
              <MCSelect id="btype" disabled={!isEditing} value={form.businessType} onChange={fc("businessType")}>
                <option value="">Select business type</option>
                {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </MCSelect>
            </MCField>
            <MCField label="Incorporation Date" htmlFor="incdate"><MCInput id="incdate" type="date" disabled={!isEditing} value={form.incorporationDate} onChange={fc("incorporationDate")} /></MCField>
          </div>
        </MCSection>
      )}
      {activeSection === "address" && (
        <MCSection title="Registered Address" subtitle="Official business address used in invoices and documents" icon={<MapPin size={16} />} color="green">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><MCField label="Address Line 1" htmlFor="adr1"><MCInput id="adr1" placeholder="Street, Building, Floor" disabled={!isEditing} value={form.addressLine1} onChange={fc("addressLine1")} /></MCField></div>
            <div className="md:col-span-2"><MCField label="Address Line 2" htmlFor="adr2"><MCInput id="adr2" placeholder="Area, Landmark (optional)" disabled={!isEditing} value={form.addressLine2} onChange={fc("addressLine2")} /></MCField></div>
            <MCField label="City" htmlFor="city"><MCInput id="city" placeholder="City" disabled={!isEditing} value={form.city} onChange={fc("city")} /></MCField>
            <MCField label="State" htmlFor="state"><MCSelect id="state" disabled={!isEditing} value={form.state} onChange={fc("state")}><option value="">Select state</option>{INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}</MCSelect></MCField>
            <MCField label="Pincode" htmlFor="pin"><MCInput id="pin" placeholder="6-digit PIN" disabled={!isEditing} maxLength={6} value={form.pincode} onChange={fc("pincode")} /></MCField>
            <MCField label="Country" htmlFor="country"><MCInput id="country" placeholder="Country" disabled={!isEditing} value={form.country} onChange={fc("country")} /></MCField>
          </div>
        </MCSection>
      )}
      {activeSection === "contact" && (
        <MCSection title="Contact Details" subtitle="How clients and partners can reach your business" icon={<Phone size={16} />} color="purple">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MCField label="Phone Number" htmlFor="cphone"><MCInput id="cphone" placeholder="+91 98765 43210" disabled={!isEditing} value={form.phone} onChange={fc("phone")} /></MCField>
            <MCField label="Email Address" htmlFor="cemail"><MCInput id="cemail" type="email" placeholder="info@company.com" disabled={!isEditing} value={form.email} onChange={fc("email")} /></MCField>
            <div className="md:col-span-2"><MCField label="Website" htmlFor="cweb"><MCInput id="cweb" placeholder="https://www.yourcompany.com" disabled={!isEditing} value={form.website} onChange={fc("website")} /></MCField></div>
          </div>
        </MCSection>
      )}
      {activeSection === "tax" && (
        isReg ? (
          <MCSection title="Tax & Legal Details" subtitle="Required for GST compliance, e-invoicing, and audits" icon={<FileText size={16} />} color="red">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MCField label="GST Number" required htmlFor="gst"><MCInput id="gst" placeholder="e.g. 22AAAAA0000A1Z5" disabled={!isEditing} maxLength={15} style={{ textTransform: "uppercase" }} value={form.gstNumber} onChange={fc("gstNumber")} /></MCField>
              <MCField label="PAN Number" required htmlFor="pan"><MCInput id="pan" placeholder="e.g. ABCDE1234F" disabled={!isEditing} maxLength={10} style={{ textTransform: "uppercase" }} value={form.panNumber} onChange={fc("panNumber")} /></MCField>
              <MCField label="CIN Number" htmlFor="cin"><MCInput id="cin" placeholder="e.g. U74999MH2010PTC123456" disabled={!isEditing} style={{ textTransform: "uppercase" }} value={form.cinNumber} onChange={fc("cinNumber")} /></MCField>
            </div>
          </MCSection>
        ) : (
          <MCSection title="Legal Details" subtitle="Basic legal identifier for your business" icon={<Hash size={16} />} color="amber">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MCField label="PAN Number (Optional)" htmlFor="pan2"><MCInput id="pan2" placeholder="e.g. ABCDE1234F" disabled={!isEditing} maxLength={10} style={{ textTransform: "uppercase" }} value={form.panNumber} onChange={fc("panNumber")} /></MCField>
            </div>
            <div className="mt-4 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <BadgeCheck size={15} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">No GST Number needed for unregistered businesses.</p>
            </div>
          </MCSection>
        )
      )}
      {activeSection === "bank" && (
        <MCSection title="Bank Details" subtitle="Used for payment processing and financial documents" icon={<Landmark size={16} />} color="indigo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MCField label="Bank Name" htmlFor="bkname"><MCInput id="bkname" placeholder="e.g. State Bank of India" disabled={!isEditing} value={form.bankName} onChange={fc("bankName")} /></MCField>
            <MCField label="Account Holder Name" htmlFor="holder"><MCInput id="holder" placeholder="Name on account" disabled={!isEditing} value={form.accountHolderName} onChange={fc("accountHolderName")} /></MCField>
            <MCField label="Account Number" htmlFor="accno"><MCInput id="accno" placeholder="Bank account number" disabled={!isEditing} value={form.accountNumber} onChange={fc("accountNumber")} /></MCField>
            <MCField label="IFSC Code" htmlFor="ifsc"><MCInput id="ifsc" placeholder="e.g. SBIN0001234" disabled={!isEditing} style={{ textTransform: "uppercase" }} value={form.ifscCode} onChange={fc("ifscCode")} /></MCField>
          </div>
        </MCSection>
      )}
    </div>
  );
}

// ── MC helper components ──────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-100",  icon: "bg-blue-100 text-blue-600",    text: "text-blue-700"   },
  green:  { bg: "bg-green-50",  border: "border-green-100", icon: "bg-green-100 text-green-600",  text: "text-green-700"  },
  purple: { bg: "bg-purple-50", border: "border-purple-100",icon: "bg-purple-100 text-purple-600",text: "text-purple-700" },
  red:    { bg: "bg-red-50",    border: "border-red-100",   icon: "bg-red-100 text-red-600",      text: "text-red-700"    },
  amber:  { bg: "bg-amber-50",  border: "border-amber-100", icon: "bg-amber-100 text-amber-600",  text: "text-amber-700"  },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-100",icon: "bg-indigo-100 text-indigo-600",text: "text-indigo-700" },
};

function MCSection({ title, subtitle, icon, color = "blue", children }: {
  title: string; subtitle?: string; icon: React.ReactNode; color?: string; children: React.ReactNode;
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} overflow-hidden`}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/60 bg-white/40">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>{icon}</div>
        <div>
          <h3 className={`text-sm font-bold ${c.text}`}>{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function MCField({ label, htmlFor, required, children }: {
  label: string; htmlFor: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
        {label}{required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function MCInput({ disabled, className = "", style, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { disabled?: boolean }) {
  return (
    <input disabled={disabled} style={style}
      className={`w-full px-4 py-2.5 text-sm rounded-xl transition-all ${
        disabled
          ? "border border-gray-200 bg-white/70 text-gray-600 cursor-default"
          : "border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 hover:border-gray-400"
      } ${className}`}
      {...props} />
  );
}

function MCSelect({ disabled, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { disabled?: boolean }) {
  return (
    <select disabled={disabled}
      className={`w-full px-4 py-2.5 text-sm rounded-xl transition-all ${
        disabled
          ? "border border-gray-200 bg-white/70 text-gray-500 cursor-default"
          : "border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 hover:border-gray-400"
      }`}
      {...props}>
      {children}
    </select>
  );
}
