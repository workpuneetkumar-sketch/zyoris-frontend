"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Edit, X, Check, Loader2 } from "lucide-react";
import api from "@/lib/api/api";
import { toast } from "react-toastify";

interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface ProfileUIProps {
  profile: Profile | null;
  fallback: {
    email: string;
    name: string;
    role: string;
  };
}

export default function ProfileUI({ profile, fallback }: ProfileUIProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name ?? fallback.name);
  const [originalName, setOriginalName] = useState(profile?.name ?? fallback.name);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSave = async () => {
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your account information and preferences
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Edit size={16} />
              Edit Profile
            </button>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Profile Header with Avatar */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-12">
            <div className="flex items-end gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center text-4xl font-bold text-blue-600 overflow-hidden">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                {isEditing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors text-white shadow-md"
                  >
                    <Camera size={16} />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

              {/* Name & Role */}
              <div className="text-white pb-2">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 text-xl font-bold w-full"
                      placeholder="Enter your name"
                    />
                  </div>
                ) : (
                  <h2 className="text-2xl font-bold">{profile?.name ?? fallback.name}</h2>
                )}
                <p className="text-blue-100 mt-1">
                  {(profile?.role ?? fallback.role).replace(/_/g, " ")}
                </p>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500">Email Address</label>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-900">{profile?.email ?? fallback.email}</p>
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-500">Role</label>
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-900">
                    {(profile?.role ?? fallback.role).replace(/_/g, " ")}
                  </p>
                </div>
              </div>

              {/* Created At */}
              {profile && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Member Since</label>
                  <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-900">
                      {new Date(profile.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Last Updated */}
              {profile && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-900">
                      {new Date(profile.updatedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons (Edit Mode) */}
            {isEditing && (
              <div className="mt-8 pt-6 border-t border-gray-200 flex items-center gap-3 justify-end">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
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
      </div>
    </div>
  );
}
