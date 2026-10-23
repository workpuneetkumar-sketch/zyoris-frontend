"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Trash2,
  Lock,
  Hash,
  Loader2,
  AlertCircle,
  Check,
  Settings,
  Edit2,
  Bell,
  BellOff,
  Archive,
  RotateCcw,
  Globe,
} from "lucide-react";
import { Channel, ChannelMember, MemberRole, ChannelAudience } from "@/types/connect";
import {
  getChannelMembers,
  addChannelMember,
  updateChannelMember,
  updateChannelMemberRole,
  removeChannelMember,
  updateChannel,
  archiveChannel,
  restoreChannel,
  deleteChannel,
  isChannelMuted,
  toggleMuteChannel,
} from "@/lib/api/connectApi";
import { TeamMember } from "@/lib/api/organizationsApi";

interface ChannelMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel;
  currentUserId?: string | null;
  teamMembers: TeamMember[];
  onChannelUpdated: (updated: Channel) => void;
  onChannelDeleted: (channelId: string) => void;
}

export default function ChannelMembersModal({
  isOpen,
  onClose,
  channel,
  currentUserId,
  teamMembers,
  onChannelUpdated,
  onChannelDeleted,
}: ChannelMembersModalProps) {
  const [activeTab, setActiveTab] = useState<"members" | "add" | "settings">("members");
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add Member State
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<MemberRole>("MEMBER");

  // Settings State
  const [channelName, setChannelName] = useState(channel.name);
  const [channelDesc, setChannelDesc] = useState(channel.description || "");
  const [channelAudience, setChannelAudience] = useState<ChannelAudience>(channel.audience || "INTERNAL");
  const [channelClientId, setChannelClientId] = useState(channel.clientId || "");
  const [isReadOnly, setIsReadOnly] = useState(Boolean(channel.isReadOnly));
  const [isMuted, setIsMuted] = useState(false);
  const [isArchived, setIsArchived] = useState(Boolean(channel.archivedAt));

  useEffect(() => {
    if (isOpen && channel?.id) {
      loadMembers();
      setChannelName(channel.name);
      setChannelDesc(channel.description || "");
      setChannelAudience(channel.audience || "INTERNAL");
      setChannelClientId(channel.clientId || "");
      setIsReadOnly(Boolean(channel.isReadOnly));
      setIsMuted(isChannelMuted(channel.id));
      setIsArchived(Boolean(channel.archivedAt));
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, channel?.id, channel?.archivedAt, channel?.audience, channel?.isReadOnly]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await getChannelMembers(channel.id);
      setMembers(data);
    } catch (err) {
      console.error("Failed to load channel members:", err);
      setError("Failed to load channel members");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter team members not in channel
  const memberUserIds = new Set(members.map((m) => m.userId));
  const availableToAdd = teamMembers.filter((tm) => !memberUserIds.has(tm.id));

  // Determine current user permissions
  const currentUserMember = members.find((m) => m.userId === currentUserId);
  const canManage =
    !currentUserMember ||
    currentUserMember.role === "OWNER" ||
    currentUserMember.role === "ADMIN";

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setActionLoading(true);
    setError(null);
    try {
      const newMember = await addChannelMember(channel.id, selectedUserId, selectedRole);
      setMembers((prev) => [...prev, newMember]);
      setSuccessMsg("Member added successfully");
      setSelectedUserId("");
      setActiveTab("members");
    } catch (err: any) {
      console.error("Failed to add member:", err);
      setError(err?.response?.data?.message || "Failed to add member");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: MemberRole) => {
    setActionLoading(true);
    setError(null);
    try {
      const updated = await updateChannelMemberRole(channel.id, userId, newRole);
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role: updated.role || newRole } : m))
      );
      setSuccessMsg(`Member role updated to ${newRole}`);
    } catch (err: any) {
      console.error("Failed to update role:", err);
      setError(err?.response?.data?.message || "Failed to update role");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestrictionChange = async (
    userId: string,
    restriction: "NONE" | "READ_ONLY" | "MUTED"
  ) => {
    setActionLoading(true);
    setError(null);
    try {
      await updateChannelMember(channel.id, userId, { restriction });
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, restriction } : m))
      );
      setSuccessMsg(`Member restriction set to ${restriction === "NONE" ? "Normal" : restriction}`);
    } catch (err: any) {
      console.error("Failed to update member restriction:", err);
      setError(err?.response?.data?.message || "Failed to update member restriction");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member from the channel?")) return;

    setActionLoading(true);
    setError(null);
    try {
      const ok = await removeChannelMember(channel.id, userId);
      if (ok) {
        setMembers((prev) => prev.filter((m) => m.userId !== userId));
        setSuccessMsg("Member removed");
      }
    } catch (err: any) {
      console.error("Failed to remove member:", err);
      setError(err?.response?.data?.message || "Failed to remove member");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleMute = () => {
    const next = toggleMuteChannel(channel.id);
    setIsMuted(next);
    setSuccessMsg(next ? "Channel notifications muted" : "Channel notifications unmuted");
  };

  const handleArchiveChannel = async () => {
    if (!confirm(`Are you sure you want to archive #${channel.name}? Members will no longer be able to post messages.`)) return;
    setActionLoading(true);
    setError(null);
    try {
      const archived = await archiveChannel(channel.id);
      if (archived) {
        setIsArchived(true);
        onChannelUpdated(archived);
        setSuccessMsg("Channel archived successfully");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to archive channel");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreChannel = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const restored = await restoreChannel(channel.id);
      if (restored) {
        setIsArchived(false);
        onChannelUpdated(restored);
        setSuccessMsg("Channel restored successfully");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to restore channel");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    try {
      const updated = await updateChannel(channel.id, {
        name: channelName,
        description: channelDesc,
        audience: channelAudience,
        clientId: channelAudience === "CLIENT_SHARED" ? channelClientId.trim() : null,
        isReadOnly: isReadOnly,
      });
      onChannelUpdated(updated);
      setSuccessMsg("Channel updated successfully");
    } catch (err: any) {
      console.error("Failed to update channel:", err);
      setError(err?.response?.data?.message || "Failed to update channel");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!confirm(`Are you sure you want to delete #${channel.name}? This cannot be undone.`)) return;

    setActionLoading(true);
    setError(null);
    try {
      const ok = await deleteChannel(channel.id);
      if (ok) {
        onChannelDeleted(channel.id);
        onClose();
      }
    } catch (err: any) {
      console.error("Failed to delete channel:", err);
      setError(err?.response?.data?.message || "Failed to delete channel");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              {channel.visibility === "PRIVATE" ? <Lock size={20} /> : <Hash size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight">#{channel.name}</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    channel.visibility === "PRIVATE"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {channel.visibility}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {channel.description || "No channel description"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 px-6 bg-white gap-6">
          <button
            onClick={() => {
              setActiveTab("members");
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "members"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Users size={16} />
            Members ({members.length})
          </button>

          {canManage && (
            <button
              onClick={() => {
                setActiveTab("add");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                activeTab === "add"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <UserPlus size={16} />
              Add Member
            </button>
          )}

          {canManage && (
            <button
              onClick={() => {
                setActiveTab("settings");
                setError(null);
                setSuccessMsg(null);
              }}
              className={`py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all ${
                activeTab === "settings"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <Settings size={16} />
              Settings
            </button>
          )}
        </div>

        {/* Messages / Alerts */}
        <div className="px-6 pt-3">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs text-red-600 mb-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2.5 text-xs text-green-700 mb-2">
              <Check size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Tab 1: Member List */}
        {activeTab === "members" && (
          <div className="p-6 overflow-y-auto flex-1 space-y-3">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
                <Loader2 size={24} className="animate-spin text-blue-600" />
                <p className="text-xs">Loading channel members...</p>
              </div>
            ) : members.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                No members found in this channel
              </div>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
                {members.map((m) => {
                  const displayName = m.user?.name || `User ${m.userId.slice(-6)}`;
                  const displayEmail = m.user?.email || "";
                  const isCurrentUser = m.userId === currentUserId;
                  const isOwner = m.role === "OWNER";

                  return (
                    <div
                      key={m.id || m.userId}
                      className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                          {displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                            {isCurrentUser && (
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                                You
                              </span>
                            )}
                          </div>
                          {displayEmail && <p className="text-xs text-gray-500">{displayEmail}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Member Role & Restriction controls */}
                        {canManage && !isOwner && !isCurrentUser ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={m.role}
                              disabled={actionLoading}
                              onChange={(e) => handleRoleChange(m.userId, e.target.value as MemberRole)}
                              className="text-xs font-semibold px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                              title="Member Role"
                            >
                              <option value="MEMBER">Member</option>
                              <option value="ADMIN">Admin</option>
                            </select>

                            <select
                              value={m.restriction || "NONE"}
                              disabled={actionLoading}
                              onChange={(e) =>
                                handleRestrictionChange(
                                  m.userId,
                                  e.target.value as "NONE" | "READ_ONLY" | "MUTED"
                                )
                              }
                              className={`text-xs font-semibold px-2 py-1 rounded-lg border focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ${
                                m.restriction === "MUTED"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : m.restriction === "READ_ONLY"
                                  ? "bg-blue-50 text-blue-800 border-blue-200"
                                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                              }`}
                              title="Member Permission Restriction"
                            >
                              <option value="NONE">Normal</option>
                              <option value="READ_ONLY">Read-Only</option>
                              <option value="MUTED">Muted</option>
                            </select>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                isOwner
                                  ? "bg-amber-100 text-amber-800"
                                  : m.role === "ADMIN"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {m.role}
                            </span>
                            {m.restriction && m.restriction !== "NONE" && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  m.restriction === "MUTED"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {m.restriction}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Remove button */}
                        {canManage && !isOwner && !isCurrentUser && (
                          <button
                            onClick={() => handleRemoveMember(m.userId)}
                            disabled={actionLoading}
                            title="Remove from channel"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Add Member */}
        {activeTab === "add" && (
          <form onSubmit={handleAddMember} className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Select Team Member
              </label>
              {availableToAdd.length === 0 ? (
                <p className="text-xs text-gray-500 p-4 border border-dashed rounded-xl text-center">
                  All active team members are already in this channel.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white">
                  {availableToAdd.map((tm) => (
                    <div
                      key={tm.id}
                      onClick={() => setSelectedUserId(tm.id)}
                      className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        selectedUserId === tm.id ? "bg-blue-50/70" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                          {tm.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900">{tm.name}</p>
                          <p className="text-[10px] text-gray-500">{tm.email}</p>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="addMemberRadio"
                        checked={selectedUserId === tm.id}
                        onChange={() => setSelectedUserId(tm.id)}
                        className="text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {availableToAdd.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Initial Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("MEMBER")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedRole === "MEMBER"
                        ? "bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20"
                        : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-xs font-bold">Member</div>
                    <p className="text-[10px] text-gray-500">Can view, read, and post messages</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole("ADMIN")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedRole === "ADMIN"
                        ? "bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20"
                        : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-xs font-bold">Admin</div>
                    <p className="text-[10px] text-gray-500">Can manage channel members & settings</p>
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={actionLoading || !selectedUserId}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
              >
                {actionLoading && <Loader2 size={14} className="animate-spin" />}
                <span>Add Member to Channel</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Settings */}
        {activeTab === "settings" && (
          <form onSubmit={handleSaveSettings} className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* General Info */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={channelDesc}
                  onChange={(e) => setChannelDesc(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>

            {/* Audience / Client Visibility */}
            <div className="pt-3 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Audience & Client Visibility
              </label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setChannelAudience("INTERNAL")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    channelAudience === "INTERNAL"
                      ? "bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20"
                      : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={14} className="text-blue-600" />
                    <span className="text-xs font-bold">Internal Team</span>
                  </div>
                  <p className="text-[10px] text-gray-500">Only organization members have access</p>
                </button>

                <button
                  type="button"
                  onClick={() => setChannelAudience("CLIENT_SHARED")}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    channelAudience === "CLIENT_SHARED"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20"
                      : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Globe size={14} className="text-emerald-600" />
                    <span className="text-xs font-bold">Client Shared</span>
                  </div>
                  <p className="text-[10px] text-gray-500">Accessible to clients and external collaborators</p>
                </button>
              </div>

              {channelAudience === "CLIENT_SHARED" && (
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                  <label className="block text-[11px] font-semibold text-emerald-900 uppercase tracking-wider mb-1">
                    Client ID / Organization Link
                  </label>
                  <input
                    type="text"
                    value={channelClientId}
                    onChange={(e) => setChannelClientId(e.target.value)}
                    placeholder="Enter Client ID or Organization Reference"
                    className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-emerald-700 mt-1">
                    Required for external client portal access and visibility filtering.
                  </p>
                </div>
              )}
            </div>

            {/* Posting Restrictions & Mute */}
            <div className="pt-3 border-t border-gray-100 space-y-3">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Permissions & Notifications
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReadOnly}
                  onChange={(e) => setIsReadOnly(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <p className="text-xs font-bold text-gray-900">Read-Only Channel</p>
                  <p className="text-[11px] text-gray-500">
                    Only channel admins and owners can post messages. Regular members can only read and react.
                  </p>
                </div>
              </label>

              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/50">
                <div className="flex items-center gap-2.5">
                  {isMuted ? (
                    <BellOff size={16} className="text-amber-600" />
                  ) : (
                    <Bell size={16} className="text-gray-500" />
                  )}
                  <div>
                    <p className="text-xs font-bold text-gray-900">Channel Notifications</p>
                    <p className="text-[11px] text-gray-500">
                      {isMuted ? "Notifications are muted for this channel" : "Receiving all channel notifications"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                    isMuted
                      ? "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {isMuted ? "Unmute" : "Mute"}
                </button>
              </div>
            </div>

            {/* Lifecycle: Archive & Restore */}
            <div className="pt-3 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Channel Lifecycle
              </label>

              {isArchived ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900">
                    <Archive size={16} className="text-amber-600" />
                    <div>
                      <p className="text-xs font-bold">This channel is archived</p>
                      <p className="text-[10px] text-amber-700">Message sending is locked for all users.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRestoreChannel}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <RotateCcw size={12} />
                    Restore Channel
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-900">Archive Channel</p>
                    <p className="text-[10px] text-gray-500">
                      Disable posting while keeping message history readable.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleArchiveChannel}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <Archive size={12} />
                    Archive
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleDeleteChannel}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                Delete Channel
              </button>

              <button
                type="submit"
                disabled={actionLoading || !channelName.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 transition-all"
              >
                {actionLoading && <Loader2 size={14} className="animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
