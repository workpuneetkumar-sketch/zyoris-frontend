"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Users,
  UserPlus,
  Trash2,
  Loader2,
  AlertCircle,
  Check,
  Shield,
} from "lucide-react";
import { Conversation, ConversationMember, MemberRole } from "@/types/connect";
import {
  getConversationMembers,
  addConversationMember,
  updateConversationMember,
  removeConversationMember,
} from "@/lib/api/connectApi";
import { TeamMember } from "@/lib/api/organizationsApi";

interface GroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  currentUserId?: string | null;
  teamMembers: TeamMember[];
  onConversationUpdated?: (updated: Conversation) => void;
}

export default function GroupMembersModal({
  isOpen,
  onClose,
  conversation,
  currentUserId,
  teamMembers,
  onConversationUpdated,
}: GroupMembersModalProps) {
  const [activeTab, setActiveTab] = useState<"members" | "add">("members");
  const [members, setMembers] = useState<ConversationMember[]>(conversation.members || []);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<MemberRole>("MEMBER");

  useEffect(() => {
    if (isOpen && conversation?.id) {
      loadMembers();
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, conversation?.id]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const data = await getConversationMembers(conversation.id);
      if (data.length > 0) {
        setMembers(data);
      } else {
        setMembers(conversation.members || []);
      }
    } catch (e) {
      console.warn("Failed to load conversation members:", e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentMemberIds = new Set(members.map((m) => m.userId));
  const availableToAdd = teamMembers.filter((tm) => !currentMemberIds.has(tm.id));

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setActionLoading(true);
    setError(null);
    try {
      const newMember = await addConversationMember(conversation.id, selectedUserId, selectedRole);
      setMembers((prev) => [...prev, newMember]);
      setSuccess("Member added successfully");
      setSelectedUserId("");
      setActiveTab("members");
      onConversationUpdated?.({
        ...conversation,
        members: [...members, newMember],
      });
    } catch (err: any) {
      console.error("Failed to add member to conversation:", err);
      setError("Failed to add member to group.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remove this member from group conversation?")) return;

    setActionLoading(true);
    setError(null);
    try {
      await removeConversationMember(conversation.id, userId);
      const updatedList = members.filter((m) => m.userId !== userId);
      setMembers(updatedList);
      setSuccess("Member removed");
      onConversationUpdated?.({
        ...conversation,
        members: updatedList,
      });
    } catch (err: any) {
      console.error("Failed to remove member:", err);
      setError("Failed to remove member.");
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
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Users size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text truncate max-w-[220px]">
                {conversation.name || "Group Members"}
              </h3>
              <p className="text-xs text-text-muted">{members.length} members in this chat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text hover:bg-surface-hover rounded-xl"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="px-6 pt-3 flex items-center gap-2 border-b border-border text-xs">
          <button
            onClick={() => setActiveTab("members")}
            className={`pb-2.5 font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === "members"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <Users size={13} />
            <span>Members ({members.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("add")}
            className={`pb-2.5 font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === "add"
                ? "border-primary text-primary"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            <UserPlus size={13} />
            <span>Add People</span>
          </button>
        </div>

        {/* Feedback messages */}
        {error && (
          <div className="mx-6 mt-3 p-3 bg-error/10 border border-error/20 rounded-xl flex items-center gap-2 text-xs text-error">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mx-6 mt-3 p-3 bg-success/10 border border-success/20 rounded-xl flex items-center gap-2 text-xs text-success">
            <Check size={14} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab 1: Member list */}
        {activeTab === "members" && (
          <div className="p-4 overflow-y-auto flex-1 divide-y divide-border-light space-y-1">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-text-muted">
                <Loader2 size={20} className="animate-spin text-primary mb-1" />
                <span className="text-xs">Loading members...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">No members found</div>
            ) : (
              members.map((m) => {
                const name = m.user?.name || `User ${m.userId?.slice(-4) || ""}`;
                const email = m.user?.email || "";
                const isSelf = m.userId === currentUserId;
                return (
                  <div key={m.userId} className="py-2.5 px-2 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 text-xs font-bold flex items-center justify-center">
                        {name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-text">{name}</p>
                          {isSelf && (
                            <span className="text-[10px] text-text-muted font-normal">(You)</span>
                          )}
                        </div>
                        {email && <p className="text-[10px] text-text-muted">{email}</p>}
                      </div>
                    </div>
                    {!isSelf && (
                      <button
                        onClick={() => handleRemoveMember(m.userId)}
                        disabled={actionLoading}
                        className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                        title="Remove from group"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Add member */}
        {activeTab === "add" && (
          <form onSubmit={handleAddMember} className="p-6 space-y-4 flex-1">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">
                Select Colleague to Add
              </label>
              {availableToAdd.length === 0 ? (
                <p className="text-xs text-text-muted italic py-4 text-center">
                  All available organization colleagues are already in this group chat.
                </p>
              ) : (
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">-- Choose a teammate --</option>
                  {availableToAdd.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name} ({tm.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                type="submit"
                disabled={actionLoading || !selectedUserId}
                className="px-5 py-2 bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-bold rounded-xl shadow-md disabled:opacity-40 flex items-center gap-2"
              >
                {actionLoading && <Loader2 size={13} className="animate-spin" />}
                <span>Add to Group</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
