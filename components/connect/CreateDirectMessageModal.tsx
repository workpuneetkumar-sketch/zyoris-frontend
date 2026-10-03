"use client";

import React, { useState } from "react";
import { X, Search, MessageSquare, Loader2, AlertCircle, UserCircle2 } from "lucide-react";
import { Conversation } from "@/types/connect";
import { createDirectConversation } from "@/lib/api/connectApi";
import { TeamMember } from "@/lib/api/organizationsApi";

interface CreateDirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: TeamMember[];
  currentUserId?: string | null;
  onConversationCreated: (conversation: Conversation) => void;
}

export default function CreateDirectMessageModal({
  isOpen,
  onClose,
  teamMembers,
  currentUserId,
  onConversationCreated,
}: CreateDirectMessageModalProps) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter out self
  const filteredMembers = teamMembers.filter((m) => {
    const isNotSelf = m.id !== currentUserId;
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      (m.department && m.department.toLowerCase().includes(search.toLowerCase()));
    return isNotSelf && matchesSearch;
  });

  const handleSelectUser = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const conv = await createDirectConversation(userId);
      onConversationCreated(conv);
      onClose();
    } catch (err: any) {
      console.error("Failed to open direct conversation:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Could not initiate conversation with this user.";
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
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight">New Direct Message</h3>
              <p className="text-xs text-gray-500">Start a 1-on-1 private chat with a teammate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search colleagues by name, email, or role..."
              autoFocus
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-xs text-red-600">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Member List */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-gray-50">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Loader2 size={24} className="animate-spin text-blue-600" />
              <p className="text-xs font-medium">Opening conversation...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-xs">
              {search ? "No colleagues matched your search" : "No team members found"}
            </div>
          ) : (
            filteredMembers.map((member) => (
              <div
                key={member.id}
                onClick={() => handleSelectUser(member.id)}
                className="py-2.5 px-3 flex items-center justify-between hover:bg-blue-50/60 rounded-xl cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                        {member.name}
                      </p>
                      {member.role && (
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded font-medium">
                          {member.role}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">{member.email}</p>
                  </div>
                </div>
                <div className="text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Message →
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
