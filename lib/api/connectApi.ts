// lib/api/connectApi.ts
// Connect Communication Client Implementation
// Interfacing with Nitin's Communication Domain APIs (/api/communications)

import api from "./api";
import {
  Channel,
  ChannelMember,
  ChannelVisibility,
  ChannelAudience,
  Conversation,
  ConversationMember,
  ConnectMessage,
  MemberRole,
  SendMessagePayload,
  SendThreadReplyPayload,
  UnreadSummaryItem,
  BusinessEntityType,
  BusinessEntityLink,
  CommunicationStats,
  CommunicationInboxItem,
} from "@/types/connect";

const BASE_COMM = "/api/communications";

/* -------------------------------------------------------------------------- */
/*                           CLIENT CACHE (DAY 2)                             */
/* -------------------------------------------------------------------------- */

const CHANNELS_CACHE_KEY_PREFIX = "zyoris_connect_channels_";
const CONVERSATIONS_CACHE_KEY_PREFIX = "zyoris_connect_convs_";

function getActiveOrgOrUserKey(): string {
  if (typeof window === "undefined") return "default";
  try {
    const raw = localStorage.getItem("zyoris-auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      const orgId = parsed?.user?.organizationId || parsed?.organizationId;
      if (orgId) return `org_${orgId}`;
      const uid = parsed?.user?.id || parsed?.id;
      if (uid) return `usr_${uid}`;
    }
  } catch {}
  return "default";
}

export function getCachedChannels(): Channel[] {
  if (typeof window === "undefined") return [];
  try {
    const key = `${CHANNELS_CACHE_KEY_PREFIX}${getActiveOrgOrUserKey()}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function setCachedChannels(channels: Channel[]): void {
  if (typeof window === "undefined") return;
  try {
    const key = `${CHANNELS_CACHE_KEY_PREFIX}${getActiveOrgOrUserKey()}`;
    localStorage.setItem(key, JSON.stringify(channels));
  } catch {}
}

export function getCachedConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const key = `${CONVERSATIONS_CACHE_KEY_PREFIX}${getActiveOrgOrUserKey()}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function setCachedConversations(convs: Conversation[]): void {
  if (typeof window === "undefined") return;
  try {
    const key = `${CONVERSATIONS_CACHE_KEY_PREFIX}${getActiveOrgOrUserKey()}`;
    localStorage.setItem(key, JSON.stringify(convs));
  } catch {}
}

/* -------------------------------------------------------------------------- */
/*                                CHANNELS                                    */
/* -------------------------------------------------------------------------- */

export interface ChannelsFetchResult {
  data: Channel[];
  error: string | null;
  fromCache: boolean;
}

/**
 * Fetch channels with detailed error and cache provenance
 */
export async function fetchChannelsResult(): Promise<ChannelsFetchResult> {
  const cached = getCachedChannels();
  try {
    const res = await api.get(`${BASE_COMM}/channels`);
    const data = res.data;
    let list: Channel[] = [];
    if (Array.isArray(data)) list = data;
    else if (data?.data && Array.isArray(data.data)) list = data.data;
    else if (data?.channels && Array.isArray(data.channels)) list = data.channels;

    // Server-authoritative update of client cache
    setCachedChannels(list);
    return { data: list, error: null, fromCache: false };
  } catch (error: any) {
    const errorMsg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Failed to fetch channels from server";
    console.warn("Failed to fetch channels from backend, falling back to cache:", errorMsg);
    return { data: cached, error: errorMsg, fromCache: true };
  }
}

/**
 * Fetch all channels for the current user's organization (preserves cache on error)
 */
export async function getChannels(): Promise<Channel[]> {
  const res = await fetchChannelsResult();
  return res.data;
}

/**
 * Fetch a single channel by ID with full details & members
 */
export async function getChannelById(channelId: string): Promise<Channel | null> {
  try {
    const res = await api.get(`${BASE_COMM}/channels/${channelId}`);
    return res.data?.data || res.data || null;
  } catch (error: any) {
    console.warn(`Failed to fetch channel ${channelId}:`, error);
    return null;
  }
}

/**
 * Create a new channel (PUBLIC or PRIVATE)
 */
export async function createChannel(payload: {
  name: string;
  description?: string;
  visibility: ChannelVisibility;
  audience?: ChannelAudience;
  clientId?: string | null;
}): Promise<Channel> {
  const cleanName = payload.name.trim().toLowerCase().replace(/\s+/g, "-");
  const normVisibility = (payload.visibility || "PUBLIC").toUpperCase() as ChannelVisibility;
  const body: Record<string, any> = {
    name: cleanName,
    description: payload.description?.trim() || undefined,
    visibility: normVisibility,
  };
  if (payload.audience) {
    body.audience = payload.audience;
    if (payload.audience === "CLIENT_SHARED" && payload.clientId) {
      body.clientId = payload.clientId;
    }
  }

  const res = await api.post(`${BASE_COMM}/channels`, body);
  const created: Channel = res.data?.data || res.data;

  // Persist into cache immediately upon creation
  if (created && created.id) {
    const existing = getCachedChannels();
    if (!existing.some((c) => c.id === created.id)) {
      setCachedChannels([created, ...existing]);
    }
  }

  return created;
}

/**
 * Update an existing channel (name, description, visibility, audience, restrictions)
 */
export async function updateChannel(
  channelId: string,
  payload: {
    name?: string;
    description?: string;
    visibility?: ChannelVisibility;
    audience?: ChannelAudience;
    clientId?: string | null;
    isReadOnly?: boolean;
  }
): Promise<Channel> {
  const body: Record<string, any> = {};
  if (payload.name) body.name = payload.name.trim().toLowerCase().replace(/\s+/g, "-");
  if (payload.description !== undefined) body.description = payload.description.trim();
  if (payload.visibility) body.visibility = payload.visibility;
  if (payload.isReadOnly !== undefined) body.isReadOnly = payload.isReadOnly;
  if (payload.audience) {
    body.audience = payload.audience;
    if (payload.audience === "CLIENT_SHARED" && payload.clientId) {
      body.clientId = payload.clientId;
    }
  }

  const res = await api.patch(`${BASE_COMM}/channels/${channelId}`, body);
  const updated: Channel = res.data?.data || res.data;

  // Update in cache
  const existing = getCachedChannels();
  setCachedChannels(
    existing.map((c) => (c.id === channelId ? { ...c, ...updated } : c))
  );

  return updated;
}

/**
 * Archive a channel: DELETE /api/communications/channels/:id
 * (Backend marks archivedAt timestamp and archivedById)
 */
export async function archiveChannel(channelId: string): Promise<Channel | null> {
  try {
    const res = await api.delete(`${BASE_COMM}/channels/${channelId}`);
    const archived: Channel = res.data?.data || res.data;
    // Update cache
    const existing = getCachedChannels();
    setCachedChannels(
      existing.map((c) =>
        c.id === channelId
          ? { ...c, ...archived, archivedAt: archived?.archivedAt || new Date().toISOString() }
          : c
      )
    );
    return archived;
  } catch (error: any) {
    console.warn(`Failed to archive channel ${channelId}:`, error);
    return null;
  }
}

/**
 * Restore an archived channel: POST /api/communications/channels/:id/restore
 */
export async function restoreChannel(channelId: string): Promise<Channel | null> {
  try {
    const res = await api.post(`${BASE_COMM}/channels/${channelId}/restore`);
    const restored: Channel = res.data?.data || res.data;
    // Update cache
    const existing = getCachedChannels();
    setCachedChannels(
      existing.map((c) =>
        c.id === channelId
          ? { ...c, ...restored, archivedAt: null, archivedById: null }
          : c
      )
    );
    return restored;
  } catch (error: any) {
    console.warn(`Failed to restore channel ${channelId}:`, error);
    return null;
  }
}

/**
 * Delete / Archive a channel (alias for archiveChannel)
 */
export async function deleteChannel(channelId: string): Promise<boolean> {
  const result = await archiveChannel(channelId);
  return result !== null;
}

/* -------------------------------------------------------------------------- */
/*                           CHANNEL MUTE HELPERS                             */
/* -------------------------------------------------------------------------- */

const MUTED_CHANNELS_KEY = "zyoris_muted_channels";
const MUTED_CONVERSATIONS_KEY = "zyoris_muted_conversations";

export function getMutedChannels(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MUTED_CHANNELS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isChannelMuted(channelId: string): boolean {
  return getMutedChannels().includes(channelId);
}

export function toggleMuteChannel(channelId: string, mute?: boolean): boolean {
  if (typeof window === "undefined") return false;
  try {
    const current = new Set(getMutedChannels());
    const shouldMute = mute !== undefined ? mute : !current.has(channelId);
    if (shouldMute) {
      current.add(channelId);
    } else {
      current.delete(channelId);
    }
    localStorage.setItem(MUTED_CHANNELS_KEY, JSON.stringify(Array.from(current)));
    return shouldMute;
  } catch {
    return false;
  }
}

export function getMutedConversations(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MUTED_CONVERSATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isConversationMuted(conversationId: string): boolean {
  return getMutedConversations().includes(conversationId);
}

export function toggleMuteConversation(conversationId: string, mute?: boolean): boolean {
  if (typeof window === "undefined") return false;
  try {
    const current = new Set(getMutedConversations());
    const shouldMute = mute !== undefined ? mute : !current.has(conversationId);
    if (shouldMute) {
      current.add(conversationId);
    } else {
      current.delete(conversationId);
    }
    localStorage.setItem(MUTED_CONVERSATIONS_KEY, JSON.stringify(Array.from(current)));
    return shouldMute;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                            CHANNEL MEMBERS                                 */
/* -------------------------------------------------------------------------- */

/**
 * Fetch all members of a channel
 */
export async function getChannelMembers(channelId: string): Promise<ChannelMember[]> {
  try {
    const res = await api.get(`${BASE_COMM}/channels/${channelId}/members`);
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.members && Array.isArray(data.members)) return data.members;
    return [];
  } catch (error: any) {
    console.warn(`Failed to fetch channel members for ${channelId}:`, error);
    return [];
  }
}

/**
 * Add a member to a channel
 */
export async function addChannelMember(
  channelId: string,
  userId: string,
  role: MemberRole = "MEMBER"
): Promise<ChannelMember> {
  const res = await api.post(`${BASE_COMM}/channels/${channelId}/members`, {
    userId,
    role,
  });
  return res.data?.data || res.data;
}

/**
 * Update a channel member's role or restriction
 */
export async function updateChannelMember(
  channelId: string,
  userId: string,
  payload: { role?: MemberRole; restriction?: "NONE" | "READ_ONLY" | "MUTED" }
): Promise<ChannelMember> {
  const res = await api.patch(`${BASE_COMM}/channels/${channelId}/members/${userId}`, payload);
  return res.data?.data || res.data;
}

/**
 * Update a channel member's role (e.g. promote to ADMIN or change to MEMBER)
 */
export async function updateChannelMemberRole(
  channelId: string,
  userId: string,
  role: MemberRole
): Promise<ChannelMember> {
  return updateChannelMember(channelId, userId, { role });
}

/**
 * Remove a member from a channel
 */
export async function removeChannelMember(
  channelId: string,
  userId: string
): Promise<boolean> {
  try {
    const res = await api.delete(`${BASE_COMM}/channels/${channelId}/members/${userId}`);
    return res.status === 200 || res.status === 204 || res.data?.success === true;
  } catch (error: any) {
    console.warn(`Failed to remove member ${userId} from channel ${channelId}:`, error);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                             CONVERSATIONS                                  */
/* -------------------------------------------------------------------------- */

export interface ConversationsFetchResult {
  data: Conversation[];
  error: string | null;
  fromCache: boolean;
}

/**
 * Fetch conversations with error and cache provenance
 */
export async function fetchConversationsResult(): Promise<ConversationsFetchResult> {
  const cached = getCachedConversations();
  try {
    const res = await api.get(`${BASE_COMM}/conversations`);
    const data = res.data;
    let list: Conversation[] = [];
    if (Array.isArray(data)) list = data;
    else if (data?.data && Array.isArray(data.data)) list = data.data;
    else if (data?.conversations && Array.isArray(data.conversations)) list = data.conversations;

    // Server-authoritative update of client cache
    setCachedConversations(list);
    return { data: list, error: null, fromCache: false };
  } catch (error: any) {
    const errorMsg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Failed to fetch conversations from server";
    console.warn("Failed to fetch conversations from backend, falling back to cache:", errorMsg);
    return { data: cached, error: errorMsg, fromCache: true };
  }
}

/**
 * Fetch all conversations (Direct and Group) for current user (preserves cache on error)
 */
export async function getConversations(): Promise<Conversation[]> {
  const res = await fetchConversationsResult();
  return res.data;
}

/**
 * Fetch a conversation by ID
 */
export async function getConversationById(conversationId: string): Promise<Conversation | null> {
  try {
    const res = await api.get(`${BASE_COMM}/conversations/${conversationId}`);
    return res.data?.data || res.data || null;
  } catch (error: any) {
    console.warn(`Failed to fetch conversation ${conversationId}:`, error);
    return null;
  }
}

/**
 * Open or create a direct 1-to-1 conversation with a specific user
 */
export async function createDirectConversation(targetUserId: string): Promise<Conversation> {
  const res = await api.post(`${BASE_COMM}/conversations/direct/${targetUserId}`, {});
  const created: Conversation = res.data?.data || res.data;

  if (created && created.id) {
    const existing = getCachedConversations();
    if (!existing.some((c) => c.id === created.id)) {
      setCachedConversations([created, ...existing]);
    }
  }

  return created;
}

/**
 * Create a new group conversation with 2 or more members
 */
export async function createGroupConversation(payload: {
  name: string;
  memberIds: string[];
}): Promise<Conversation> {
  const res = await api.post(`${BASE_COMM}/conversations/group`, {
    name: payload.name.trim(),
    memberIds: payload.memberIds,
  });
  const created: Conversation = res.data?.data || res.data;

  if (created && created.id) {
    const existing = getCachedConversations();
    if (!existing.some((c) => c.id === created.id)) {
      setCachedConversations([created, ...existing]);
    }
  }

  return created;
}

/**
 * Fetch all members of a conversation
 */
export async function getConversationMembers(conversationId: string): Promise<ConversationMember[]> {
  try {
    const res = await api.get(`${BASE_COMM}/conversations/${conversationId}/members`);
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.members && Array.isArray(data.members)) return data.members;
    return [];
  } catch (error: any) {
    console.warn(`Failed to fetch conversation members for ${conversationId}:`, error);
    return [];
  }
}

/**
 * Add a member to an existing conversation
 */
export async function addConversationMember(
  conversationId: string,
  userId: string,
  role: MemberRole = "MEMBER"
): Promise<ConversationMember> {
  const res = await api.post(`${BASE_COMM}/conversations/${conversationId}/members`, {
    userId,
    role,
  });
  return res.data?.data || res.data;
}

/**
 * Update member role in a conversation
 */
export async function updateConversationMember(
  conversationId: string,
  userId: string,
  role: MemberRole
): Promise<ConversationMember> {
  const res = await api.patch(`${BASE_COMM}/conversations/${conversationId}/members/${userId}`, {
    role,
  });
  return res.data?.data || res.data;
}

/**
 * Remove a member from a conversation
 */
export async function removeConversationMember(
  conversationId: string,
  userId: string
): Promise<boolean> {
  try {
    const res = await api.delete(`${BASE_COMM}/conversations/${conversationId}/members/${userId}`);
    return res.status === 200 || res.status === 204 || res.data?.success === true;
  } catch (error: any) {
    console.warn(`Failed to remove member ${userId} from conversation ${conversationId}:`, error);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                                MESSAGES                                    */
/* -------------------------------------------------------------------------- */

/**
 * Fetch messages for a channel: GET /api/communications/messages?channelId=<channelId>&limit=50
 */
export async function getChannelMessages(
  channelId: string,
  limit: number = 50,
  cursor?: string,
  signal?: AbortSignal
): Promise<{ data: ConnectMessage[]; nextCursor?: string | null }> {
  const query = new URLSearchParams();
  query.set("channelId", channelId);
  query.set("limit", String(limit));
  if (cursor) query.set("cursor", cursor);

  const res = await api.get(`${BASE_COMM}/messages?${query.toString()}`, { signal });
  const resData = res.data;

  let list: ConnectMessage[] = [];
  let nextCursor: string | null = null;

  if (Array.isArray(resData)) {
    list = resData;
  } else if (resData?.data && Array.isArray(resData.data)) {
    list = resData.data;
    nextCursor = resData.nextCursor ?? null;
  } else if (resData?.messages && Array.isArray(resData.messages)) {
    list = resData.messages;
    nextCursor = resData.nextCursor ?? null;
  }

  // Chronological ascending order (oldest to newest)
  list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Attach stored/cached business links immediately so links persist upon refresh
  list = list.map((m) => ({
    ...m,
    businessLinks:
      m.businessLinks && m.businessLinks.length > 0
        ? m.businessLinks
        : getStoredLinksForMessage(m.id),
  }));

  return { data: list, nextCursor };
}

/**
 * Fetch messages for a conversation: GET /api/communications/messages?conversationId=<conversationId>&limit=50&cursor=<messageId>
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 50,
  cursor?: string,
  signal?: AbortSignal
): Promise<{ data: ConnectMessage[]; nextCursor?: string | null }> {
  const query = new URLSearchParams();
  query.set("conversationId", conversationId);
  query.set("limit", String(limit));
  if (cursor) query.set("cursor", cursor);

  const res = await api.get(`${BASE_COMM}/messages?${query.toString()}`, { signal });
  const resData = res.data;

  let list: ConnectMessage[] = [];
  let nextCursor: string | null = null;

  if (Array.isArray(resData)) {
    list = resData;
  } else if (resData?.data && Array.isArray(resData.data)) {
    list = resData.data;
    nextCursor = resData.nextCursor ?? null;
  } else if (resData?.messages && Array.isArray(resData.messages)) {
    list = resData.messages;
    nextCursor = resData.nextCursor ?? null;
  }

  // Chronological ascending order
  list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Attach stored/cached business links immediately so links persist upon refresh
  list = list.map((m) => ({
    ...m,
    businessLinks:
      m.businessLinks && m.businessLinks.length > 0
        ? m.businessLinks
        : getStoredLinksForMessage(m.id),
  }));

  return { data: list, nextCursor };
}

/**
 * Send a message: POST /api/communications/messages
 */
export async function sendMessage(payload: SendMessagePayload): Promise<ConnectMessage> {
  const body: Record<string, any> = {
    content: payload.content,
  };
  if (payload.channelId) body.channelId = payload.channelId;
  else if (payload.conversationId) body.conversationId = payload.conversationId;
  if (payload.parentMessageId) body.parentMessageId = payload.parentMessageId;
  if (payload.attachments && payload.attachments.length > 0) body.attachments = payload.attachments;
  if (payload.mentionedUserIds && payload.mentionedUserIds.length > 0) body.mentionedUserIds = payload.mentionedUserIds;
  if (payload.visibility) body.visibility = payload.visibility;

  const res = await api.post(`${BASE_COMM}/messages`, body);
  return res.data?.data || res.data;
}

/**
 * Update message: PATCH /api/communications/messages/:messageId
 */
export async function updateMessage(
  messageId: string,
  content: string
): Promise<ConnectMessage> {
  const res = await api.patch(`${BASE_COMM}/messages/${messageId}`, {
    content,
  });
  return res.data?.data || res.data;
}

/**
 * Delete message: DELETE /api/communications/messages/:messageId
 */
export async function deleteMessage(messageId: string): Promise<ConnectMessage | boolean> {
  const res = await api.delete(`${BASE_COMM}/messages/${messageId}`);
  if (res.data?.data) return res.data.data;
  return res.status === 200 || res.status === 204 || res.data?.success === true;
}

/* -------------------------------------------------------------------------- */
/*                           THREADS & REPLIES (DAY 2)                        */
/* -------------------------------------------------------------------------- */

/**
 * Fetch thread replies for a parent message:
 * GET /api/communications/messages/:messageId/replies?limit=50&cursor=<messageId>
 */
export async function getThreadReplies(
  messageId: string,
  limit: number = 50,
  cursor?: string
): Promise<{ data: ConnectMessage[]; nextCursor?: string | null }> {
  try {
    const query = new URLSearchParams();
    query.set("limit", String(limit));
    if (cursor) query.set("cursor", cursor);

    const res = await api.get(`${BASE_COMM}/messages/${messageId}/replies?${query.toString()}`);
    const resData = res.data;

    let list: ConnectMessage[] = [];
    let nextCursor: string | null = null;

    if (Array.isArray(resData)) {
      list = resData;
    } else if (resData?.data && Array.isArray(resData.data)) {
      list = resData.data;
      nextCursor = resData.nextCursor ?? null;
    } else if (resData?.replies && Array.isArray(resData.replies)) {
      list = resData.replies;
      nextCursor = resData.nextCursor ?? null;
    }

    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return { data: list, nextCursor };
  } catch (error: any) {
    console.warn(`Failed to fetch thread replies for ${messageId} from backend:`, error);
    // Fallback: check localStorage for locally cached thread replies
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`zyoris-replies-${messageId}`);
      if (stored) {
        try {
          return { data: JSON.parse(stored), nextCursor: null };
        } catch (e) {}
      }
    }
    return { data: [], nextCursor: null };
  }
}

/**
 * Post a reply in a thread:
 * POST /api/communications/messages/:messageId/replies
 */
export async function sendThreadReply(
  payload: SendThreadReplyPayload
): Promise<ConnectMessage> {
  const body: Record<string, any> = {
    content: payload.content,
  };
  if (payload.attachments && payload.attachments.length > 0) body.attachments = payload.attachments;
  if (payload.mentionedUserIds && payload.mentionedUserIds.length > 0) body.mentionedUserIds = payload.mentionedUserIds;

  try {
    const res = await api.post(`${BASE_COMM}/messages/${payload.messageId}/replies`, body);
    const sent = res.data?.data || res.data;
    // Cache locally as backup
    cacheThreadReplyLocally(payload.messageId, sent);
    return sent;
  } catch (error: any) {
    console.warn(`POST thread reply endpoint error, checking local fallback:`, error);
    // Create client fallback response so user flow never breaks
    const fallback: ConnectMessage = {
      id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      organizationId: "",
      senderId: "me",
      parentMessageId: payload.messageId,
      content: payload.content,
      type: "TEXT",
      createdAt: new Date().toISOString(),
      status: "sent",
      sender: {
        id: "me",
        name: "You",
        email: "",
      },
    };
    cacheThreadReplyLocally(payload.messageId, fallback);
    return fallback;
  }
}

function cacheThreadReplyLocally(messageId: string, reply: ConnectMessage) {
  if (typeof window === "undefined") return;
  try {
    const key = `zyoris-replies-${messageId}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    if (!existing.some((r: any) => r.id === reply.id)) {
      existing.push(reply);
      localStorage.setItem(key, JSON.stringify(existing));
    }
  } catch (e) {}
}

/* -------------------------------------------------------------------------- */
/*                             REACTIONS (DAY 2)                              */
/* -------------------------------------------------------------------------- */

/**
 * Add reaction: POST /api/communications/messages/:messageId/reactions
 */
export async function addReaction(
  messageId: string,
  emoji: string
): Promise<any> {
  try {
    const res = await api.post(`${BASE_COMM}/messages/${messageId}/reactions`, { emoji });
    return res.data?.data || res.data;
  } catch (error: any) {
    console.warn(`Failed to add reaction ${emoji} to ${messageId}:`, error);
    return { success: true, messageId, emoji };
  }
}

/**
 * Remove reaction: DELETE /api/communications/messages/:messageId/reactions/:emoji
 */
export async function removeReaction(
  messageId: string,
  emoji: string
): Promise<boolean> {
  try {
    const encoded = encodeURIComponent(emoji);
    const res = await api.delete(`${BASE_COMM}/messages/${messageId}/reactions/${encoded}`);
    return res.status === 200 || res.status === 204 || res.data?.success === true;
  } catch (error: any) {
    console.warn(`Failed to remove reaction ${emoji} from ${messageId}:`, error);
    return true;
  }
}

/* -------------------------------------------------------------------------- */
/*                         READ STATE & UNREAD (DAY 2)                        */
/* -------------------------------------------------------------------------- */

/**
 * Mark channel as read: POST /api/communications/channels/:id/read
 */
export async function markChannelAsRead(
  channelId: string,
  lastReadMessageId?: string
): Promise<boolean> {
  if (!channelId || !lastReadMessageId || typeof lastReadMessageId !== "string" || !lastReadMessageId.trim()) {
    return false;
  }
  try {
    const res = await api.post(`${BASE_COMM}/channels/${channelId}/read`, {
      lastReadMessageId: lastReadMessageId.trim(),
    });
    return res.status === 200 || res.status === 204 || res.data?.success === true;
  } catch (error: any) {
    console.warn(`[ConnectApi] Failed to mark channel ${channelId} as read:`, error?.response?.data || error?.message);
    return false;
  }
}

/**
 * Mark conversation as read: POST /api/communications/conversations/:id/read
 */
export async function markConversationAsRead(
  conversationId: string,
  lastReadMessageId?: string
): Promise<boolean> {
  if (!conversationId || !lastReadMessageId || typeof lastReadMessageId !== "string" || !lastReadMessageId.trim()) {
    return false;
  }
  try {
    const res = await api.post(`${BASE_COMM}/conversations/${conversationId}/read`, {
      lastReadMessageId: lastReadMessageId.trim(),
    });
    return res.status === 200 || res.status === 204 || res.data?.success === true;
  } catch (error: any) {
    console.warn(`[ConnectApi] Failed to mark conversation ${conversationId} as read:`, error?.response?.data || error?.message);
    return false;
  }
}

/**
 * Get unread summary: GET /api/communications/unread
 */
export async function getUnreadSummary(): Promise<UnreadSummaryItem[]> {
  try {
    const res = await api.get(`${BASE_COMM}/unread`);
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.unread && Array.isArray(data.unread)) return data.unread;
    return [];
  } catch (error: any) {
    console.warn("Failed to fetch /unread from backend:", error);
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/*                       PINS & SAVED MESSAGES (DAY 2)                        */
/* -------------------------------------------------------------------------- */

export interface PinSaveResult {
  success: boolean;
  data?: any;
  error?: string;
}

function normalizePinnedMessage(item: any): ConnectMessage {
  const msg = item?.message && typeof item.message === "object" ? item.message : item;
  const canonicalId = item?.messageId || msg?.id || item?.id;
  return {
    ...msg,
    id: canonicalId,
    messageId: canonicalId,
    pinRelationId: item?.id !== canonicalId ? item?.id : undefined,
    pinnedById: item?.pinnedById,
    pinnedBy: item?.pinnedBy,
    channelId: item?.channelId ?? msg?.channelId ?? null,
    conversationId: item?.conversationId ?? msg?.conversationId ?? null,
    isPinned: true,
    content: msg?.content || item?.content || "",
    sender: msg?.sender || item?.sender,
    createdAt: msg?.createdAt || item?.createdAt || new Date().toISOString(),
  } as ConnectMessage;
}

function normalizeSavedMessage(item: any): ConnectMessage {
  const msg = item?.message && typeof item.message === "object" ? item.message : item;
  const canonicalId = item?.messageId || msg?.id || item?.id;
  return {
    ...msg,
    id: canonicalId,
    messageId: canonicalId,
    saveRelationId: item?.id !== canonicalId ? item?.id : undefined,
    channelId: item?.channelId ?? msg?.channelId ?? null,
    conversationId: item?.conversationId ?? msg?.conversationId ?? null,
    isSaved: true,
    content: msg?.content || item?.content || "",
    sender: msg?.sender || item?.sender,
    createdAt: msg?.createdAt || item?.createdAt || new Date().toISOString(),
  } as ConnectMessage;
}

/**
 * Pin message: POST /api/communications/messages/:messageId/pin
 */
export async function pinMessage(messageId: string): Promise<PinSaveResult> {
  try {
    const res = await api.post(`${BASE_COMM}/messages/${messageId}/pin`, {});
    return { success: true, data: res.data?.data || res.data };
  } catch (error: any) {
    const errorMsg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Failed to pin message";
    console.error(`Failed to pin message ${messageId}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Unpin message: DELETE /api/communications/messages/:messageId/pin
 */
export async function unpinMessage(messageId: string): Promise<boolean> {
  try {
    const res = await api.delete(`${BASE_COMM}/messages/${messageId}/pin`);
    return res.status === 200 || res.status === 204 || res.data?.success === true;
  } catch (error: any) {
    console.error(`Failed to unpin message ${messageId}:`, error?.response?.data || error?.message);
    return false;
  }
}

/**
 * Get channel pinned messages: GET /api/communications/channels/:id/pins
 */
export async function getChannelPins(channelId: string): Promise<ConnectMessage[]> {
  try {
    const res = await api.get(`${BASE_COMM}/channels/${channelId}/pins`);
    const data = res.data;
    let list: any[] = [];
    if (Array.isArray(data)) list = data;
    else if (data?.data && Array.isArray(data.data)) list = data.data;
    else if (data?.pins && Array.isArray(data.pins)) list = data.pins;
    return list.map(normalizePinnedMessage);
  } catch (error: any) {
    console.warn(`Failed to fetch pins for channel ${channelId}:`, error);
    return [];
  }
}

/**
 * Get conversation pinned messages: GET /api/communications/conversations/:id/pins
 */
export async function getConversationPins(conversationId: string): Promise<ConnectMessage[]> {
  try {
    const res = await api.get(`${BASE_COMM}/conversations/${conversationId}/pins`);
    const data = res.data;
    let list: any[] = [];
    if (Array.isArray(data)) list = data;
    else if (data?.data && Array.isArray(data.data)) list = data.data;
    else if (data?.pins && Array.isArray(data.pins)) list = data.pins;
    return list.map(normalizePinnedMessage);
  } catch (error: any) {
    console.warn(`Failed to fetch pins for conversation ${conversationId}:`, error);
    return [];
  }
}

/**
 * Save / bookmark message: POST /api/communications/messages/:messageId/save
 */
export async function saveMessage(messageId: string): Promise<PinSaveResult> {
  try {
    const res = await api.post(`${BASE_COMM}/messages/${messageId}/save`, {});
    return { success: true, data: res.data?.data || res.data };
  } catch (error: any) {
    const errorMsg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Failed to save message";
    console.error(`Failed to save message ${messageId}:`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Unsave / remove bookmark: DELETE /api/communications/messages/:messageId/save
 */
export async function unsaveMessage(messageId: string): Promise<boolean> {
  try {
    const res = await api.delete(`${BASE_COMM}/messages/${messageId}/save`);
    return res.status === 200 || res.status === 204 || res.data?.success === true;
  } catch (error: any) {
    console.error(`Failed to unsave message ${messageId}:`, error?.response?.data || error?.message);
    return false;
  }
}

/**
 * Get saved messages: GET /api/communications/saved?limit=50&cursor=<savedMessageId>
 */
export async function getSavedMessages(
  limit: number = 50,
  cursor?: string
): Promise<{ data: ConnectMessage[]; nextCursor?: string | null }> {
  try {
    const query = new URLSearchParams();
    query.set("limit", String(limit));
    if (cursor) query.set("cursor", cursor);

    const res = await api.get(`${BASE_COMM}/saved?${query.toString()}`);
    const data = res.data;
    let list: any[] = [];
    let nextCursor: string | null = null;

    if (Array.isArray(data)) {
      list = data;
    } else if (data?.data && Array.isArray(data.data)) {
      list = data.data;
      nextCursor = data.nextCursor ?? null;
    } else if (data?.saved && Array.isArray(data.saved)) {
      list = data.saved;
      nextCursor = data.nextCursor ?? null;
    }
    return { data: list.map(normalizeSavedMessage), nextCursor };
  } catch (error: any) {
    console.warn("Failed to fetch saved messages:", error);
    return { data: [], nextCursor: null };
  }
}

/* -------------------------------------------------------------------------- */
/*                               SEARCH (DAY 2)                               */
/* -------------------------------------------------------------------------- */

/**
 * Search messages:
 * GET /api/communications/search?q=<query>&channelId=<channelId>&conversationId=<conversationId>&limit=50&cursor=<messageId>
 */
export async function searchMessages(
  query: string,
  options?: {
    channelId?: string;
    conversationId?: string;
    limit?: number;
    cursor?: string;
  }
): Promise<{ data: ConnectMessage[]; nextCursor?: string | null }> {
  try {
    const params = new URLSearchParams();
    params.set("q", query);
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.cursor) params.set("cursor", options.cursor);
    if (options?.channelId) params.set("channelId", options.channelId);
    if (options?.conversationId) params.set("conversationId", options.conversationId);

    const res = await api.get(`${BASE_COMM}/search?${params.toString()}`);
    const data = res.data;
    let list: ConnectMessage[] = [];
    let nextCursor: string | null = null;

    if (Array.isArray(data)) {
      list = data;
    } else if (data?.data && Array.isArray(data.data)) {
      list = data.data;
      nextCursor = data.nextCursor ?? null;
    } else if (data?.results && Array.isArray(data.results)) {
      list = data.results;
      nextCursor = data.nextCursor ?? null;
    }
    return { data: list, nextCursor };
  } catch (error: any) {
    console.warn(`Failed to search messages for '${query}':`, error);
    return { data: [], nextCursor: null };
  }
}

/* -------------------------------------------------------------------------- */
/*                        BUSINESS ENTITY LINKS (DAY 2 & 3)                   */
/* -------------------------------------------------------------------------- */

const MESSAGE_LINKS_STORAGE_KEY = "zyoris_connect_message_links";

export function getStoredMessageLinks(): Record<string, BusinessEntityLink[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MESSAGE_LINKS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function getStoredLinksForMessage(messageId: string): BusinessEntityLink[] {
  const store = getStoredMessageLinks();
  return store[messageId] || [];
}

export function saveMessageLinkToStorage(messageId: string, link: BusinessEntityLink) {
  if (typeof window === "undefined") return;
  try {
    const store = getStoredMessageLinks();
    const existing = store[messageId] || [];
    const filtered = existing.filter((l) => l.id !== link.id);
    store[messageId] = [...filtered, link];
    localStorage.setItem(MESSAGE_LINKS_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn("Failed to persist message link to storage:", e);
  }
}

export function setStoredLinksForMessage(messageId: string, links: BusinessEntityLink[]) {
  if (typeof window === "undefined") return;
  try {
    const store = getStoredMessageLinks();
    store[messageId] = links;
    localStorage.setItem(MESSAGE_LINKS_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn("Failed to set message links to storage:", e);
  }
}

export function removeMessageLinkFromStorage(messageId: string, linkId: string) {
  if (typeof window === "undefined") return;
  try {
    const store = getStoredMessageLinks();
    if (store[messageId]) {
      store[messageId] = store[messageId].filter((l) => l.id !== linkId);
      if (store[messageId].length === 0) {
        delete store[messageId];
      }
      localStorage.setItem(MESSAGE_LINKS_STORAGE_KEY, JSON.stringify(store));
    }
  } catch (e) {
    console.warn("Failed to remove message link from storage:", e);
  }
}

/**
 * Link message to a business entity:
 * POST /api/communications/messages/:messageId/links
 * Must NOT mask backend failure with optimistic UI state.
 */
export async function linkMessageToEntity(
  messageId: string,
  targetType: BusinessEntityType,
  targetId: string,
  metadata?: any
): Promise<BusinessEntityLink> {
  const body = {
    targetType: targetType.toUpperCase(),
    targetId,
    metadata,
  };
  const res = await api.post(`${BASE_COMM}/messages/${messageId}/links`, body);
  const raw = res.data?.data || res.data;

  const title =
    raw.title ||
    raw.target?.title ||
    raw.target?.name ||
    raw.target?.subject ||
    metadata?.title ||
    raw.metadata?.title ||
    targetId;

  const link: BusinessEntityLink = {
    id: raw.id,
    messageId: raw.messageId || messageId,
    targetType: (raw.targetType || targetType) as BusinessEntityType,
    targetId: raw.targetId || targetId,
    title,
    url: raw.url,
    metadata: raw.metadata || metadata,
    createdAt: raw.createdAt || new Date().toISOString(),
    createdBy: raw.createdBy,
  };

  saveMessageLinkToStorage(messageId, link);
  return link;
}

/**
 * Get links for a specific message:
 * GET /api/communications/messages/:messageId/links
 */
export async function getMessageLinks(messageId: string): Promise<BusinessEntityLink[]> {
  try {
    const res = await api.get(`${BASE_COMM}/messages/${messageId}/links`);
    const data = res.data;
    let list: any[] = [];
    if (Array.isArray(data)) list = data;
    else if (data?.data && Array.isArray(data.data)) list = data.data;
    else if (data?.links && Array.isArray(data.links)) list = data.links;

    const normalized: BusinessEntityLink[] = list.map((l) => ({
      id: l.id,
      messageId: l.messageId || messageId,
      targetType: (l.targetType || "TASK") as BusinessEntityType,
      targetId: l.targetId,
      title:
        l.title ||
        l.target?.title ||
        l.target?.name ||
        l.target?.subject ||
        l.metadata?.title ||
        l.targetId,
      url: l.url,
      metadata: l.metadata,
      createdAt: l.createdAt,
      createdBy: l.createdBy,
    }));

    if (normalized.length > 0) {
      setStoredLinksForMessage(messageId, normalized);
    }
    return normalized;
  } catch (error: any) {
    console.warn(`Failed to get links for message ${messageId}:`, error);
    return getStoredLinksForMessage(messageId);
  }
}

/**
 * Delete a business entity link:
 * DELETE /api/communications/messages/:messageId/links/:linkId
 */
export async function removeMessageLink(
  messageId: string,
  linkId: string
): Promise<boolean> {
  try {
    const res = await api.delete(`${BASE_COMM}/messages/${messageId}/links/${linkId}`);
    const ok = res.status === 200 || res.status === 204 || res.data?.success === true;
    if (ok) {
      removeMessageLinkFromStorage(messageId, linkId);
    }
    return ok;
  } catch (error: any) {
    console.warn(`Failed to delete message link ${linkId}:`, error);
    removeMessageLinkFromStorage(messageId, linkId);
    return true;
  }
}

/**
 * Get all links pointing to a business entity:
 * GET /api/communications/links?targetType=<targetType>&targetId=<targetId>&limit=50&cursor=<linkId>
 */
export async function getLinksByEntity(
  targetType: BusinessEntityType,
  targetId: string,
  limit: number = 50,
  cursor?: string
): Promise<{ data: BusinessEntityLink[]; nextCursor?: string | null }> {
  try {
    const params = new URLSearchParams();
    params.set("targetType", targetType.toUpperCase());
    params.set("targetId", targetId);
    params.set("limit", String(limit));
    if (cursor) params.set("cursor", cursor);

    const res = await api.get(`${BASE_COMM}/links?${params.toString()}`);
    const data = res.data;
    let list: BusinessEntityLink[] = [];
    let nextCursor: string | null = null;

    if (Array.isArray(data)) {
      list = data;
    } else if (data?.data && Array.isArray(data.data)) {
      list = data.data;
      nextCursor = data.nextCursor ?? null;
    } else if (data?.links && Array.isArray(data.links)) {
      list = data.links;
      nextCursor = data.nextCursor ?? null;
    }
    return { data: list, nextCursor };
  } catch (error: any) {
    console.warn(`Failed to get links for entity ${targetType}:${targetId}:`, error);
    return { data: [], nextCursor: null };
  }
}

/* -------------------------------------------------------------------------- */
/*                     STATS, INBOX & ADVANCED LINKS (DAY 3)                  */
/* -------------------------------------------------------------------------- */

/**
 * Get communication stats: GET /api/communications/stats
 */
export async function getCommunicationStats(): Promise<CommunicationStats | null> {
  try {
    const res = await api.get(`${BASE_COMM}/stats`);
    return res.data?.data || res.data || null;
  } catch (error: any) {
    console.warn("Failed to fetch communication stats:", error);
    return null;
  }
}

/**
 * Get unified communication inbox: GET /api/communications/inbox
 */
export async function getCommunicationInbox(
  limit: number = 50,
  offset: number = 0
): Promise<{ total: number; data: CommunicationInboxItem[] }> {
  try {
    const res = await api.get(`${BASE_COMM}/inbox?limit=${limit}&offset=${offset}`);
    const data = res.data;
    if (data && Array.isArray(data.data)) {
      return { total: data.total ?? data.data.length, data: data.data };
    }
    if (Array.isArray(data)) {
      return { total: data.length, data };
    }
    return { total: 0, data: [] };
  } catch (error: any) {
    console.warn("Failed to fetch communication inbox:", error);
    return { total: 0, data: [] };
  }
}

/**
 * Query all links across communications: GET /api/communications/links
 */
export async function getAllCommunicationLinks(params?: {
  targetType?: BusinessEntityType;
  targetId?: string;
  limit?: number;
  cursor?: string;
}): Promise<{ data: BusinessEntityLink[]; nextCursor?: string | null }> {
  try {
    const query = new URLSearchParams();
    if (params?.targetType) query.set("targetType", params.targetType.toUpperCase());
    if (params?.targetId) query.set("targetId", params.targetId);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.cursor) query.set("cursor", params.cursor);

    const res = await api.get(`${BASE_COMM}/links?${query.toString()}`);
    const data = res.data;
    if (Array.isArray(data)) return { data, nextCursor: null };
    if (data?.data && Array.isArray(data.data)) return { data: data.data, nextCursor: data.nextCursor ?? null };
    if (data?.links && Array.isArray(data.links)) return { data: data.links, nextCursor: data.nextCursor ?? null };
    return { data: [], nextCursor: null };
  } catch (error: any) {
    console.warn("Failed to fetch communication links:", error);
    return { data: [], nextCursor: null };
  }
}

/* Backward-compatibility aliases */
export async function getConnectMessages(params: {
  channelId?: string;
  conversationId?: string;
  limit?: number;
  cursor?: string;
  signal?: AbortSignal;
}): Promise<{ data: ConnectMessage[]; nextCursor?: string | null }> {
  if (params.channelId) {
    return getChannelMessages(params.channelId, params.limit, params.cursor, params.signal);
  }
  if (params.conversationId) {
    return getConversationMessages(params.conversationId, params.limit, params.cursor, params.signal);
  }
  return { data: [], nextCursor: null };
}

export const sendConnectMessage = sendMessage;
export const updateConnectMessage = updateMessage;
export const deleteConnectMessage = deleteMessage;



