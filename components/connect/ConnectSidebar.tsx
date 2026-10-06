"use client";

import React, { useState, useMemo } from "react";
import {
  Hash,
  Lock,
  MessageSquare,
  Users,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Circle,
  Bell,
  Sparkles,
  Settings,
  UserCircle2,
  Bookmark,
} from "lucide-react";
import { Channel, Conversation, ActiveTarget } from "@/types/connect";
import { SocketStatus } from "@/hooks/useConnectSocket";

interface ConnectSidebarProps {
  channels: Channel[];
  conversations: Conversation[];
  activeTarget: ActiveTarget | null;
  onSelectChannel: (channel: Channel) => void;
  onSelectConversation: (conversation: Conversation) => void;
  onOpenCreateChannel: () => void;
  onOpenCreateDirect: () => void;
  onOpenCreateGroup: () => void;
  onOpenManageChannel: (channel: Channel) => void;
  onOpenSearchModal?: () => void;
  onOpenSavedModal?: () => void;
  currentUserId?: string | null;
  socketStatus: SocketStatus;
  unreadMap: Record<string, number>;
  className?: string;
}

export default function ConnectSidebar({
  channels,
  conversations,
  activeTarget,
  onSelectChannel,
  onSelectConversation,
  onOpenCreateChannel,
  onOpenCreateDirect,
  onOpenCreateGroup,
  onOpenManageChannel,
  onOpenSearchModal,
  onOpenSavedModal,
  currentUserId,
  socketStatus,
  unreadMap,
  className = "",
}: ConnectSidebarProps) {
  const [search, setSearch] = useState("");
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [directsOpen, setDirectsOpen] = useState(true);
  const [groupsOpen, setGroupsOpen] = useState(true);

  // Separate direct conversations from group conversations
  const directConversations = useMemo(
    () => conversations.filter((c) => c.type === "DIRECT"),
    [conversations]
  );

  const groupConversations = useMemo(
    () => conversations.filter((c) => c.type === "GROUP"),
    [conversations]
  );

  // Filter with search query
  const query = search.trim().toLowerCase();

  const filteredChannels = useMemo(() => {
    if (!query) return channels;
    return channels.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query))
    );
  }, [channels, query]);

  const filteredDirects = useMemo(() => {
    if (!query) return directConversations;
    return directConversations.filter((c) => {
      const otherMember = c.members?.find((m) => m.userId !== currentUserId);
      const name = otherMember?.user?.name || otherMember?.user?.email || "Teammate";
      return name.toLowerCase().includes(query) || (c.lastMessage && c.lastMessage.toLowerCase().includes(query));
    });
  }, [directConversations, query, currentUserId]);

  const filteredGroups = useMemo(() => {
    if (!query) return groupConversations;
    return groupConversations.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.lastMessage && c.lastMessage.toLowerCase().includes(query))
    );
  }, [groupConversations, query]);

  // Unread items calculation
  const unreadItems = useMemo(() => {
    const unreadList: Array<{
      type: "channel" | "conversation";
      id: string;
      title: string;
      subtitle: string;
      isPrivate?: boolean;
      item: Channel | Conversation;
      count: number;
    }> = [];

    // Check channels
    channels.forEach((ch) => {
      const count = unreadMap[ch.id] || 0;
      if (count > 0) {
        unreadList.push({
          type: "channel",
          id: ch.id,
          title: `#${ch.name}`,
          subtitle: "Channel",
          isPrivate: ch.visibility === "PRIVATE",
          item: ch,
          count,
        });
      }
    });

    // Check conversations
    conversations.forEach((conv) => {
      const count = unreadMap[conv.id] || 0;
      if (count > 0) {
        if (conv.type === "DIRECT") {
          const other = conv.members?.find((m) => m.userId !== currentUserId);
          const name = other?.user?.name || other?.user?.email || "Direct Message";
          unreadList.push({
            type: "conversation",
            id: conv.id,
            title: name,
            subtitle: "Direct Message",
            item: conv,
            count,
          });
        } else {
          unreadList.push({
            type: "conversation",
            id: conv.id,
            title: conv.name || "Group Chat",
            subtitle: "Group",
            item: conv,
            count,
          });
        }
      }
    });

    return unreadList;
  }, [channels, conversations, unreadMap, currentUserId]);

  return (
    <div className={`flex flex-col bg-white border-r border-gray-100 select-none ${className}`}>
      {/* Workspace Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
              Connect
            </h2>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  socketStatus === "connected"
                    ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                    : socketStatus === "connecting"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-gray-400"
                }`}
              />
              <span
                className={`font-medium ${
                  socketStatus === "connected"
                    ? "text-emerald-600"
                    : socketStatus === "connecting"
                    ? "text-amber-600"
                    : "text-gray-400"
                }`}
              >
                {socketStatus === "connected"
                  ? "Live"
                  : socketStatus === "connecting"
                  ? "Connecting..."
                  : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1">
          {onOpenSearchModal && (
            <button
              onClick={onOpenSearchModal}
              title="Search all messages"
              className="p-1.5 text-gray-500 hover:text-primary hover:bg-surface-hover rounded-lg transition-colors"
            >
              <Search size={16} />
            </button>
          )}
          {onOpenSavedModal && (
            <button
              onClick={onOpenSavedModal}
              title="Saved Bookmarks"
              className="p-1.5 text-gray-500 hover:text-primary hover:bg-surface-hover rounded-lg transition-colors"
            >
              <Bookmark size={16} />
            </button>
          )}
          <button
            onClick={onOpenCreateDirect}
            title="New Direct Message"
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-surface-hover rounded-lg transition-colors"
          >
            <MessageSquare size={16} />
          </button>
          <button
            onClick={onOpenCreateChannel}
            title="New Channel"
            className="p-1.5 text-gray-500 hover:text-primary hover:bg-surface-hover rounded-lg transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && onOpenSearchModal) {
                onOpenSearchModal();
              }
            }}
            placeholder="Search channels & chats..."
            className="w-full pl-8 pr-14 py-1.5 bg-gray-50/80 hover:bg-gray-100/80 focus:bg-white border border-gray-200/80 rounded-xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />
          {onOpenSearchModal && (
            <button
              onClick={onOpenSearchModal}
              title="Global communication search"
              className="absolute right-1 px-1.5 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/10 rounded-md transition-colors"
            >
              Search
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
        {/* ── Unread Section ─────────────────────────────────── */}
        {unreadItems.length > 0 && !query && (
          <div>
            <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Bell size={12} />
                Unread Messages ({unreadItems.length})
              </span>
            </div>
            <div className="space-y-0.5 mt-1">
              {unreadItems.map((item) => {
                const isActive =
                  activeTarget?.type === item.type && activeTarget?.id === item.id;
                return (
                  <button
                    key={`unread-${item.id}`}
                    onClick={() => {
                      if (item.type === "channel") onSelectChannel(item.item as Channel);
                      else onSelectConversation(item.item as Conversation);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-left transition-colors ${
                      isActive
                        ? "bg-amber-50 text-amber-900 font-semibold"
                        : "bg-amber-50/50 hover:bg-amber-50 text-gray-800 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.type === "channel" ? (
                        item.isPrivate ? (
                          <Lock size={14} className="text-amber-600 shrink-0" />
                        ) : (
                          <Hash size={14} className="text-amber-600 shrink-0" />
                        )
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {item.title.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs truncate">{item.title}</span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full shrink-0">
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Channels Section ───────────────────────────────── */}
        <div>
          <div className="px-2 py-1 flex items-center justify-between group">
            <button
              onClick={() => setChannelsOpen(!channelsOpen)}
              className="flex items-center gap-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-900 transition-colors"
            >
              {channelsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>Channels</span>
              <span className="text-gray-400 font-normal">({filteredChannels.length})</span>
            </button>
            <button
              onClick={onOpenCreateChannel}
              title="Create Channel"
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {channelsOpen && (
            <div className="space-y-0.5 mt-1">
              {filteredChannels.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-400 italic">
                  {query ? "No matching channels" : "No channels yet. Create one!"}
                </div>
              ) : (
                filteredChannels.map((channel) => {
                  const isActive =
                    activeTarget?.type === "channel" && activeTarget?.id === channel.id;
                  const isPrivate = channel.visibility === "PRIVATE";
                  const unread = unreadMap[channel.id] || 0;

                  return (
                    <div
                      key={channel.id}
                      className={`group flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors cursor-pointer ${
                        isActive
                          ? "bg-blue-50 text-blue-900 font-semibold shadow-xs"
                          : unread > 0
                          ? "font-bold text-gray-900 hover:bg-gray-50"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                      onClick={() => onSelectChannel(channel)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {isPrivate ? (
                          <Lock
                            size={14}
                            className={`shrink-0 ${
                              isActive
                                ? "text-amber-600"
                                : "text-amber-500/80 group-hover:text-amber-600"
                            }`}
                          />
                        ) : (
                          <Hash
                            size={14}
                            className={`shrink-0 ${
                              isActive
                                ? "text-blue-600"
                                : "text-gray-400 group-hover:text-gray-600"
                            }`}
                          />
                        )}
                        <span className="text-xs truncate">{channel.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {unread > 0 && (
                          <span className="px-1.5 py-0.2 text-[10px] font-bold bg-blue-600 text-white rounded-full">
                            {unread}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenManageChannel(channel);
                          }}
                          title="Channel Members & Settings"
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-700 hover:bg-white rounded transition-all"
                        >
                          <Settings size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ── Direct Messages Section ────────────────────────── */}
        <div>
          <div className="px-2 py-1 flex items-center justify-between group">
            <button
              onClick={() => setDirectsOpen(!directsOpen)}
              className="flex items-center gap-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-900 transition-colors"
            >
              {directsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>Direct Messages</span>
              <span className="text-gray-400 font-normal">({filteredDirects.length})</span>
            </button>
            <button
              onClick={onOpenCreateDirect}
              title="New Direct Message"
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {directsOpen && (
            <div className="space-y-0.5 mt-1">
              {filteredDirects.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-400 italic">
                  {query ? "No matching chats" : "No direct messages yet"}
                </div>
              ) : (
                filteredDirects.map((conv) => {
                  const isActive =
                    activeTarget?.type === "conversation" && activeTarget?.id === conv.id;
                  const unread = unreadMap[conv.id] || 0;

                  // Find other party
                  const other = conv.members?.find((m) => m.userId !== currentUserId);
                  const name = other?.user?.name || other?.user?.email || "Colleague";
                  const avatar = other?.user?.avatarUrl;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => onSelectConversation(conv)}
                      className={`group flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors cursor-pointer ${
                        isActive
                          ? "bg-blue-50 text-blue-900 font-semibold shadow-xs"
                          : unread > 0
                          ? "font-bold text-gray-900 hover:bg-gray-50"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="relative shrink-0">
                          {avatar ? (
                            <img src={avatar} alt={name} className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">
                              {name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs truncate">{name}</p>
                          {conv.lastMessage && (
                            <p className="text-[10px] text-gray-400 truncate font-normal">
                              {conv.lastMessage}
                            </p>
                          )}
                        </div>
                      </div>

                      {unread > 0 && (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold bg-blue-600 text-white rounded-full shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ── Group Conversations Section ────────────────────── */}
        <div>
          <div className="px-2 py-1 flex items-center justify-between group">
            <button
              onClick={() => setGroupsOpen(!groupsOpen)}
              className="flex items-center gap-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-900 transition-colors"
            >
              {groupsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span>Group Chats</span>
              <span className="text-gray-400 font-normal">({filteredGroups.length})</span>
            </button>
            <button
              onClick={onOpenCreateGroup}
              title="New Group Chat"
              className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {groupsOpen && (
            <div className="space-y-0.5 mt-1">
              {filteredGroups.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-400 italic">
                  {query ? "No matching groups" : "No group chats yet"}
                </div>
              ) : (
                filteredGroups.map((group) => {
                  const isActive =
                    activeTarget?.type === "conversation" && activeTarget?.id === group.id;
                  const unread = unreadMap[group.id] || 0;
                  const memberCount = group.members?.length || 0;

                  return (
                    <div
                      key={group.id}
                      onClick={() => onSelectConversation(group)}
                      className={`group flex items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors cursor-pointer ${
                        isActive
                          ? "bg-purple-50 text-purple-900 font-semibold shadow-xs"
                          : unread > 0
                          ? "font-bold text-gray-900 hover:bg-gray-50"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                          <Users size={12} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs truncate">{group.name || "Group Chat"}</p>
                          {group.lastMessage ? (
                            <p className="text-[10px] text-gray-400 truncate font-normal">
                              {group.lastMessage}
                            </p>
                          ) : (
                            <p className="text-[10px] text-gray-400 font-normal">
                              {memberCount} members
                            </p>
                          )}
                        </div>
                      </div>

                      {unread > 0 && (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold bg-purple-600 text-white rounded-full shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
