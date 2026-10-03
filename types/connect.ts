// types/connect.ts
// Domain Types for Connect Workspace (Task 1: Channels, Conversations, Messages & Members)
// Contracts align with Nitin's Communication Domain and Sakshi's Socket.IO events.

export type ChannelVisibility = "PUBLIC" | "PRIVATE";

export type MemberRole = "OWNER" | "ADMIN" | "MEMBER";

export interface ChannelMember {
  id: string;
  organizationId: string;
  channelId: string;
  userId: string;
  role: MemberRole;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface Channel {
  id: string;
  organizationId: string;
  name: string;
  slug?: string;
  description?: string | null;
  visibility: ChannelVisibility;
  archivedAt?: string | null;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  members?: ChannelMember[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

export type ConversationType = "DIRECT" | "GROUP";

export interface ConversationMember {
  id: string;
  organizationId: string;
  conversationId: string;
  userId: string;
  role?: MemberRole;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface Conversation {
  id: string;
  organizationId: string;
  type: ConversationType;
  name?: string | null;
  createdAt: string;
  updatedAt: string;
  members: ConversationMember[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

export interface ConnectMessage {
  id: string;
  organizationId: string;
  senderId: string;
  channelId?: string | null;
  conversationId?: string | null;
  parentMessageId?: string | null;
  content: string;
  type?: string;
  createdAt: string;
  updatedAt?: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  sender?: {
    id: string;
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
  };
  attachments?: any[];
}

export type ActiveTargetType = "channel" | "conversation";

export interface ActiveTarget {
  type: ActiveTargetType;
  id: string;
  item?: Channel | Conversation;
}

export interface SocketMessageNewPayload {
  id?: string;
  messageId?: string;
  channelId?: string | null;
  conversationId?: string | null;
  senderId?: string;
  content: string;
  createdAt?: string;
  sender?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
  };
}

export interface SocketMessageUpdatePayload {
  messageId: string;
  channelId?: string | null;
  conversationId?: string | null;
  content: string;
  updatedAt?: string;
}

export interface SocketMessageDeletePayload {
  messageId: string;
  channelId?: string | null;
  conversationId?: string | null;
}

export interface SocketChannelUpdatedPayload {
  channelId: string;
  action?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  updatedAt?: string;
}

export interface SocketConversationUpdatedPayload {
  conversationId: string;
  action?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  updatedAt?: string;
}
