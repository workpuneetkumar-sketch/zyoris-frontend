// lib/api/connectApi.ts
// Connect Communication Client Implementation
// Interfacing with Nitin's Communication Domain APIs (/api/communications)

import api from "./api";
import {
  Channel,
  ChannelMember,
  ChannelVisibility,
  Conversation,
  ConversationMember,
  ConnectMessage,
  MemberRole,
  SendMessagePayload,
  SendReplyPayload,
  SearchCommunicationsParams,
  SearchMessageResult,
  BusinessEntityLink,
  UnreadStateResponse,
  MessageAttachment,
} from "@/types/connect";

const BASE_COMM = "/api/communications";

/* -------------------------------------------------------------------------- */
/*                                CHANNELS                                    */
/* -------------------------------------------------------------------------- */

/**
 * Fetch all channels for the current user's organization
 */
export async function getChannels(): Promise<Channel[]> {
  try {
    const res = await api.get(`${BASE_COMM}/channels`);
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.channels && Array.isArray(data.channels)) return data.channels;
    return [];
  } catch (error: any) {
    console.warn("Failed to fetch channels from backend:", error);
    return [];
  }
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
}): Promise<Channel> {
  const cleanName = payload.name.trim().toLowerCase().replace(/\s+/g, "-");
  const res = await api.post(`${BASE_COMM}/channels`, {
    name: cleanName,
    description: payload.description?.trim() || undefined,
    visibility: payload.visibility,
  });
  return res.data?.data || res.data;
}

/**
 * Update an existing channel
 */
export async function updateChannel(
  channelId: string,
  payload: {
    name?: string;
    description?: string;
    visibility?: ChannelVisibility;
  }
): Promise<Channel> {
  const body: Record<string, any> = {};
  if (payload.name) body.name = payload.name.trim().toLowerCase().replace(/\s+/g, "-");
  if (payload.description !== undefined) body.description = payload.description.trim();
  if (payload.visibility) body.visibility = payload.visibility;

  const res = await api.patch(`${BASE_COMM}/channels/${channelId}`, body);
  return res.data?.data || res.data;
}

/**
 * Delete a channel
 */
export async function deleteChannel(channelId: string): Promise<boolean> {
  try {
    const res = await api.delete(`${BASE_COMM}/channels/${channelId}`);
    return res.status === 200 || res.status === 204 || res.data?.success === true;
  } catch (error: any) {
    console.warn(`Failed to delete channel ${channelId}:`, error);
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
 * Update a channel member's role (e.g. promote to ADMIN or change to MEMBER)
 */
export async function updateChannelMemberRole(
  channelId: string,
  userId: string,
  role: MemberRole
): Promise<ChannelMember> {
  const res = await api.patch(`${BASE_COMM}/channels/${channelId}/members/${userId}`, {
    role,
  });
  return res.data?.data || res.data;
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

/**
 * Fetch all conversations (Direct and Group) for current user
 */
export async function getConversations(): Promise<Conversation[]> {
  try {
    const res = await api.get(`${BASE_COMM}/conversations`);
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.conversations && Array.isArray(data.conversations)) return data.conversations;
    return [];
  } catch (error: any) {
    console.warn("Failed to fetch conversations:", error);
    return [];
  }
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
  return res.data?.data || res.data;
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
  return res.data?.data || res.data;
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
/*                           THREADS & REPLIES                                */
/* -------------------------------------------------------------------------- */

/**
 * Send a reply to a thread: POST /api/communications/messages/:messageId/replies
 */
export async function sendReply(
  messageId: string,
  payload: SendReplyPayload
): Promise<ConnectMessage> {
  const body: Record<string, any> = {
    content: payload.content,
  };
  if (payload.attachments && payload.attachments.length > 0) body.attachments = payload.attachments;
  if (payload.mentionedUserIds && payload.mentionedUserIds.length > 0) body.mentionedUserIds = payload.mentionedUserIds;

  const res = await api.post(`${BASE_COMM}/messages/${messageId}/replies`, body);
  return res.data?.data || res.data;
}

/**
 * Fetch thread replies: GET /api/communications/messages/:messageId/replies?limit=50&cursor=<messageId>
 */
export async function getMessageReplies(
  messageId: string,
  limit: number = 50,
  cursor?: string
): Promise<{ data: ConnectMessage[]; nextCursor?: string | null }> {
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

  // Sort chronological ascending
  list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return { data: list, nextCursor };
}

/* -------------------------------------------------------------------------- */
/*                                 REACTIONS                                  */
/* -------------------------------------------------------------------------- */

/**
 * Add reaction: POST /api/communications/messages/:messageId/reactions
 */
export async function addReaction(
  messageId: string,
  emoji: string
): Promise<any> {
  const res = await api.post(`${BASE_COMM}/messages/${messageId}/reactions`, { emoji });
  return res.data?.data || res.data;
}

/**
 * Remove reaction: DELETE /api/communications/messages/:messageId/reactions/:emoji
 */
export async function removeReaction(
  messageId: string,
  emoji: string
): Promise<boolean> {
  try {
    const res = await api.delete(`${BASE_COMM}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
    return res.status === 200 || res.status === 204 || res.data?.success === true;
  } catch (error: any) {
    console.warn(`Failed to remove reaction ${emoji} from ${messageId}:`, error);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                           READ STATE & UNREAD                              */
/* -------------------------------------------------------------------------- */

/**
 * Mark channel read: POST /api/communications/channels/:id/read
 */
export async function markChannelRead(channelId: string): Promise<boolean> {
  try {
    const res = await api.post(`${BASE_COMM}/channels/${channelId}/read`, {});
    return res.status === 200 || res.status === 204 || res.data?.success === true;
  } catch (error: any) {
    console.warn(`Failed to mark channel ${channelId} as read:`, error);
    return false;
  }
}

/**
 * Mark conversation read: POST /api/communications/conversations/:id/read
 */
export async function markConversationRead(conversationId: string): Promise<boolean> {
  try {
    const res = await api.post(`${BASE_COMM}/conversations/${conversationId}/read`, {});
    return res.status === 200 || res.status === 204 || res.data?.success === true;
  } catch (error: any) {
    console.warn(`Failed to mark conversation ${conversationId} as read:`, error);
    return false;
  }
}

/**
 * Fetch unread counts: GET /api/communications/unread
 */
export async function getUnreadCounts(): Promise<UnreadStateResponse> {
  try {
    const res = await api.get(`${BASE_COMM}/unread`);
    const data = res.data?.data || res.data || {};
    return {
      channels: data.channels || {},
      conversations: data.conversations || {},
      total: data.total || data.totalUnread || 0,
    };
  } catch (error: any) {
    console.warn("Failed to fetch unread counts:", error);
    return { channels: {}, conversations: {}, total: 0 };
  }
}

/* -------------------------------------------------------------------------- */
/*                           PINS & SAVED MESSAGES                            */
/* -------------------------------------------------------------------------- */

/**
 * Pin message: POST /api/communications/messages/:messageId/pin
 */
export async function pinMessage(messageId: string): Promise<any> {
  const res = await api.post(`${BASE_COMM}/messages/${messageId}/pin`, {});
  return res.data?.data || res.data;
}

/**
 * Unpin message: DELETE /api/communications/messages/:messageId/pin
 */
export async function unpinMessage(messageId: string): Promise<boolean> {
  try {
    const res = await api.delete(`${BASE_COMM}/messages/${messageId}/pin`);
    return res.status === 200 || res.status === 204 || res.data?.success === true;
  } catch (error: any) {
    console.warn(`Failed to unpin message ${messageId}:`, error);
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
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.pins && Array.isArray(data.pins)) return data.pins;
    return [];
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
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.pins && Array.isArray(data.pins)) return data.pins;
    return [];
  } catch (error: any) {
    console.warn(`Failed to fetch pins for conversation ${conversationId}:`, error);
    return [];
  }
}

/**
 * Save / bookmark message: POST /api/communications/messages/:messageId/save
 */
export async function saveMessage(messageId: string): Promise<any> {
  const res = await api.post(`${BASE_COMM}/messages/${messageId}/save`, {});
  return res.data?.data || res.data;
}

/**
 * Delete saved message bookmark: DELETE /api/communications/messages/:messageId/save
 */
export async function unsaveMessage(messageId: string): Promise<boolean> {
  try {
    const res = await api.delete(`${BASE_COMM}/messages/${messageId}/save`);
    return res.status === 200 || res.status === 204 || res.data?.success === true;
  } catch (error: any) {
    console.warn(`Failed to unsave message ${messageId}:`, error);
    return false;
  }
}

/**
 * Get user saved messages: GET /api/communications/saved?limit=50&cursor=<savedMessageId>
 */
export async function getSavedMessages(
  limit: number = 50,
  cursor?: string
): Promise<{ data: ConnectMessage[]; nextCursor?: string | null }> {
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  if (cursor) query.set("cursor", cursor);

  try {
    const res = await api.get(`${BASE_COMM}/saved?${query.toString()}`);
    const resData = res.data;

    let list: ConnectMessage[] = [];
    let nextCursor: string | null = null;

    if (Array.isArray(resData)) {
      list = resData;
    } else if (resData?.data && Array.isArray(resData.data)) {
      list = resData.data;
      nextCursor = resData.nextCursor ?? null;
    } else if (resData?.saved && Array.isArray(resData.saved)) {
      list = resData.saved.map((s: any) => s.message || s);
      nextCursor = resData.nextCursor ?? null;
    }

    return { data: list, nextCursor };
  } catch (error: any) {
    console.warn("Failed to fetch saved messages:", error);
    return { data: [], nextCursor: null };
  }
}

/* -------------------------------------------------------------------------- */
/*                                   SEARCH                                   */
/* -------------------------------------------------------------------------- */

/**
 * Search communications:
 * GET /api/communications/search?q=<query>&limit=50&cursor=<messageId>
 * (with optional channelId or conversationId scope)
 */
export async function searchCommunications(
  params: SearchCommunicationsParams
): Promise<{ data: SearchMessageResult[]; nextCursor?: string | null }> {
  const query = new URLSearchParams();
  query.set("q", params.q.trim());
  query.set("limit", String(params.limit || 50));
  if (params.channelId) query.set("channelId", params.channelId);
  if (params.conversationId) query.set("conversationId", params.conversationId);
  if (params.cursor) query.set("cursor", params.cursor);

  try {
    const res = await api.get(`${BASE_COMM}/search?${query.toString()}`);
    const resData = res.data;

    let list: SearchMessageResult[] = [];
    let nextCursor: string | null = null;

    if (Array.isArray(resData)) {
      list = resData;
    } else if (resData?.data && Array.isArray(resData.data)) {
      list = resData.data;
      nextCursor = resData.nextCursor ?? null;
    } else if (resData?.results && Array.isArray(resData.results)) {
      list = resData.results;
      nextCursor = resData.nextCursor ?? null;
    }

    return { data: list, nextCursor };
  } catch (error: any) {
    console.warn("Failed to search communications:", error);
    return { data: [], nextCursor: null };
  }
}

/* -------------------------------------------------------------------------- */
/*                           BUSINESS ENTITY LINKS                            */
/* -------------------------------------------------------------------------- */

/**
 * Link message to business entity: POST /api/communications/messages/:messageId/links
 */
export async function createMessageLink(
  messageId: string,
  payload: {
    targetType: string;
    targetId: string;
    metadata?: any;
  }
): Promise<BusinessEntityLink> {
  const res = await api.post(`${BASE_COMM}/messages/${messageId}/links`, payload);
  return res.data?.data || res.data;
}

/**
 * Get links for a message: GET /api/communications/messages/:messageId/links
 */
export async function getMessageLinks(
  messageId: string
): Promise<BusinessEntityLink[]> {
  try {
    const res = await api.get(`${BASE_COMM}/messages/${messageId}/links`);
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.links && Array.isArray(data.links)) return data.links;
    return [];
  } catch (error: any) {
    console.warn(`Failed to fetch links for message ${messageId}:`, error);
    return [];
  }
}

/**
 * Delete a message business link: DELETE /api/communications/messages/:messageId/links/:linkId
 */
export async function deleteMessageLink(
  messageId: string,
  linkId: string
): Promise<boolean> {
  try {
    const res = await api.delete(`${BASE_COMM}/messages/${messageId}/links/${linkId}`);
    return res.status === 200 || res.status === 204 || res.data?.success === true;
  } catch (error: any) {
    console.warn(`Failed to delete link ${linkId} from message ${messageId}:`, error);
    return false;
  }
}

/**
 * Get links for an entity: GET /api/communications/links?targetType=<targetType>&targetId=<targetId>&limit=50&cursor=<linkId>
 */
export async function getLinksByEntity(
  targetType: string,
  targetId: string,
  limit: number = 50,
  cursor?: string
): Promise<{ data: any[]; nextCursor?: string | null }> {
  const query = new URLSearchParams();
  query.set("targetType", targetType);
  query.set("targetId", targetId);
  query.set("limit", String(limit));
  if (cursor) query.set("cursor", cursor);

  try {
    const res = await api.get(`${BASE_COMM}/links?${query.toString()}`);
    const data = res.data;
    if (Array.isArray(data)) return { data, nextCursor: null };
    return {
      data: data?.data || data?.links || [],
      nextCursor: data?.nextCursor ?? null,
    };
  } catch (error: any) {
    console.warn(`Failed to fetch links for entity ${targetType}:${targetId}:`, error);
    return { data: [], nextCursor: null };
  }
}

/* -------------------------------------------------------------------------- */
/*                            ATTACHMENT UPLOADS                              */
/* -------------------------------------------------------------------------- */

/**
 * Upload an attachment file using existing storage contracts (/uploads/file)
 * Supports progress tracking and returns standard MessageAttachment object
 */
export async function uploadMessageAttachment(
  file: File,
  onProgress?: (percent: number) => void
): Promise<MessageAttachment> {
  // Validate file size (max 25MB)
  const MAX_SIZE = 25 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed is 25MB.`);
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post("/documents/upload", formData, {
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });

  const serverData = res.data?.data || res.data;
  const fileId = serverData?.id || serverData?.fileUploadId || `upload-${Date.now()}`;
  const downloadUrl = serverData?.url || serverData?.s3Url || `/documents/download/${fileId}`;

  return {
    id: fileId,
    fileUploadId: fileId,
    name: file.name,
    size: file.size,
    type: file.type,
    mimeType: file.type,
    url: downloadUrl,
  };
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


