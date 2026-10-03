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
 * Fetch messages for a channel or conversation with pagination
 */
export async function getConnectMessages(params: {
  channelId?: string;
  conversationId?: string;
  limit?: number;
  cursor?: string;
}): Promise<{ data: ConnectMessage[]; nextCursor?: string }> {
  try {
    const query = new URLSearchParams();
    if (params.channelId) query.set("channelId", params.channelId);
    if (params.conversationId) query.set("conversationId", params.conversationId);
    query.set("limit", String(params.limit || 50));
    if (params.cursor) query.set("cursor", params.cursor);

    const res = await api.get(`${BASE_COMM}/messages?${query.toString()}`);
    const resData = res.data;

    let list: ConnectMessage[] = [];
    let nextCursor: string | undefined = undefined;

    if (Array.isArray(resData)) {
      list = resData;
    } else if (resData?.data && Array.isArray(resData.data)) {
      list = resData.data;
      nextCursor = resData.nextCursor;
    } else if (resData?.messages && Array.isArray(resData.messages)) {
      list = resData.messages;
      nextCursor = resData.nextCursor;
    }

    // Sort chronologically ascending
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return { data: list, nextCursor };
  } catch (error: any) {
    console.warn("Failed to fetch messages:", error);
    return { data: [] };
  }
}

/**
 * Post a new message to a channel or conversation
 */
export async function sendConnectMessage(payload: {
  channelId?: string;
  conversationId?: string;
  content: string;
}): Promise<ConnectMessage> {
  const body: Record<string, any> = {
    content: payload.content,
  };
  if (payload.channelId) body.channelId = payload.channelId;
  else if (payload.conversationId) body.conversationId = payload.conversationId;

  const res = await api.post(`${BASE_COMM}/messages`, body);
  return res.data?.data || res.data;
}

/**
 * Update an existing message content
 */
export async function updateConnectMessage(
  messageId: string,
  content: string
): Promise<ConnectMessage> {
  const res = await api.patch(`${BASE_COMM}/messages/${messageId}`, {
    content,
  });
  return res.data?.data || res.data;
}

/**
 * Delete a message
 */
export async function deleteConnectMessage(messageId: string): Promise<boolean> {
  try {
    const res = await api.delete(`${BASE_COMM}/messages/${messageId}`);
    return res.status === 200 || res.status === 204 || res.data?.success === true;
  } catch (error: any) {
    console.warn(`Failed to delete message ${messageId}:`, error);
    return false;
  }
}
