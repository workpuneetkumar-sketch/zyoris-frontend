"use client";

import React, { useState } from "react";
import { X, Hash, Lock, Globe, Users, Loader2, AlertCircle } from "lucide-react";
import { Channel, ChannelVisibility, MemberRole } from "@/types/connect";
import { createChannel, addChannelMember } from "@/lib/api/connectApi";
import { TeamMember } from "@/lib/api/organizationsApi";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (channel: Channel) => void;
  teamMembers: TeamMember[];
}

export default function CreateChannelModal({
  isOpen,
  onClose,
  onCreated,
  teamMembers,
}: CreateChannelModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<ChannelVisibility>("PUBLIC");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    // Standardize to lowercase and hyphens
    const formatted = val.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");
    setName(formatted);
  };

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Channel name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const channel = await createChannel({
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
      });

      // If initial members were selected, add them
      if (selectedMemberIds.length > 0 && channel.id) {
        await Promise.allSettled(
          selectedMemberIds.map((uid) => addChannelMember(channel.id, uid, "MEMBER"))
        );
      }

      onCreated(channel);
      onClose();
    } catch (err: any) {
      console.error("Failed to create channel:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to create channel. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              {visibility === "PUBLIC" ? <Hash size={20} /> : <Lock size={20} />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 tracking-tight">Create a Channel</h3>
              <p className="text-xs text-gray-500">Channels are where team members collaborate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-sm text-red-600">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Channel Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Channel Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                #
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. project-launch"
                required
                className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Names must be lowercase, numbers, or hyphens.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Description <span className="text-gray-400 text-[10px] font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about?"
              rows={2}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Visibility selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Channel Visibility
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setVisibility("PUBLIC")}
                className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  visibility === "PUBLIC"
                    ? "bg-blue-50/70 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 shadow-sm"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Globe size={16} className={visibility === "PUBLIC" ? "text-blue-600" : "text-gray-500"} />
                  Public
                </div>
                <p className="text-xs text-gray-500 leading-tight">
                  Anyone in the workspace can view and join
                </p>
              </button>

              <button
                type="button"
                onClick={() => setVisibility("PRIVATE")}
                className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  visibility === "PRIVATE"
                    ? "bg-blue-50/70 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 shadow-sm"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Lock size={16} className={visibility === "PRIVATE" ? "text-blue-600" : "text-gray-500"} />
                  Private
                </div>
                <p className="text-xs text-gray-500 leading-tight">
                  Only invited members can view and participate
                </p>
              </button>
            </div>
          </div>

          {/* Invite Members */}
          {teamMembers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Invite Members <span className="text-gray-400 font-normal">({selectedMemberIds.length} selected)</span>
                </label>
              </div>
              <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-gray-50/50">
                {teamMembers.map((member) => {
                  const isChecked = selectedMemberIds.includes(member.id);
                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleMember(member.id)}
                      className="px-3.5 py-2 flex items-center justify-between hover:bg-white cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900">{member.name}</p>
                          <p className="text-[10px] text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              <span>Create Channel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
