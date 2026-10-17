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
  topic?: string | null;
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

export type MessageDeliveryStatus = "sending" | "sent" | "failed";

export interface MessageReactionUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface MessageReactionSummary {
  emoji: string;
  count: number;
  users: MessageReactionUser[];
  hasReacted: boolean;
}

export type BusinessEntityType =
  | "TASK"
  | "LEAD"
  | "DEAL"
  | "CONTACT"
  | "COMPANY"
  | "MEETING"
  | "PROJECT"
  | "DOCUMENT";

export interface BusinessEntityLink {
  id: string;
  messageId: string;
  targetType: BusinessEntityType;
  targetId: string;
  title?: string;
  url?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  createdBy?: {
    id: string;
    name: string;
  };
}

export interface ConnectMessage {
  id: string;
  organizationId: string;
  senderId: string;
  channelId?: string | null;
  conversationId?: string | null;
  parentMessageId?: string | null;
  parentMessage?: {
    id: string;
    content: string;
    senderId?: string;
    sender?: {
      id?: string;
      name?: string;
      avatarUrl?: string | null;
    };
  } | null;
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
  // Day 2 Collaboration Properties
  reactions?: MessageReactionSummary[];
  replyCount?: number;
  lastReplyAt?: string | null;
  replyUsers?: Array<{ id: string; name: string; avatarUrl?: string | null }>;
  isPinned?: boolean;
  isSaved?: boolean;
  businessLinks?: BusinessEntityLink[];
  mentionedUserIds?: string[];
  // Optimistic client fields
  status?: MessageDeliveryStatus;
  error?: string;
  clientMessageId?: string;
}

export interface ThreadReply extends ConnectMessage {
  parentMessageId: string;
}

export interface SendMessagePayload {
  channelId?: string;
  conversationId?: string;
  content: string;
  parentMessageId?: string | null;
  attachments?: string[];
  mentionedUserIds?: string[];
}

export interface SendThreadReplyPayload {
  messageId: string;
  content: string;
  attachments?: string[];
  mentionedUserIds?: string[];
}

export interface GetMessagesParams {
  channelId?: string;
  conversationId?: string;
  limit?: number;
  cursor?: string;
  signal?: AbortSignal;
}

export interface GetMessagesResponse {
  data: ConnectMessage[];
  nextCursor?: string | null;
}

export type MessageActionType =
  | "reply"
  | "edit"
  | "delete"
  | "react"
  | "mention"
  | "pin"
  | "save"
  | "link";

export interface MessageActionItem {
  id: MessageActionType;
  label: string;
  icon: React.ElementType;
  isDestructive?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  badge?: string;
  onClick: (message: ConnectMessage) => void;
}

export type ActiveTargetType = "channel" | "conversation";

export interface ActiveTarget {
  type: ActiveTargetType;
  id: string;
  item?: Channel | Conversation;
}

export type PresenceStatus = "ONLINE" | "AWAY" | "BUSY" | "OFFLINE";

export interface UserPresence {
  userId: string;
  status: PresenceStatus;
  customStatus?: string;
  lastActiveAt?: string;
}

export interface TypingIndicatorInfo {
  userId: string;
  userName: string;
  channelId?: string | null;
  conversationId?: string | null;
  timestamp: number;
}

export interface UnreadSummaryItem {
  id: string;
  type: "channel" | "conversation";
  unreadCount: number;
  lastReadAt?: string;
  lastMessageAt?: string;
}

export interface SocketMessageNewPayload {
  id?: string;
  messageId?: string;
  organizationId?: string;
  channelId?: string | null;
  conversationId?: string | null;
  channel?: string | null;
  receiverId?: string | null;
  senderId?: string;
  content: string;
  type?: string;
  parentMessageId?: string | null;
  createdAt?: string;
  clientMessageId?: string;
  attachments?: any[];
  mentionedUserIds?: string[];
  sender?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
  };
  receiver?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
  } | null;
}

export interface SocketMessageUpdatePayload {
  id?: string;
  messageId: string;
  channelId?: string | null;
  conversationId?: string | null;
  channel?: string | null;
  content: string;
  isEdited?: boolean;
  editedAt?: string;
  updatedAt?: string;
}

export interface SocketMessageDeletePayload {
  id?: string;
  messageId: string;
  channelId?: string | null;
  conversationId?: string | null;
  channel?: string | null;
  deletedAt?: string;
}

export interface SocketChannelUpdatedPayload {
  channelId: string;
  channel?: string;
  action?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  updatedAt?: string;
  topic?: string;
  name?: string;
}

export interface SocketConversationUpdatedPayload {
  conversationId: string;
  action?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  updatedAt?: string;
  lastMessageId?: string;
  lastMessageContent?: string;
  unreadCount?: number;
}

// Sakshi's Day 2 Collaboration Event Payloads
export interface SocketReactionAddPayload {
  messageId: string;
  emoji: string;
  userId: string;
  userName?: string;
  createdAt?: string;
}

export interface SocketReactionRemovePayload {
  messageId: string;
  emoji: string;
  userId: string;
}

export interface SocketThreadReplyPayload {
  messageId: string;
  reply?: ConnectMessage;
  content?: string;
  replyCount?: number;
}

export interface SocketMentionNewPayload {
  messageId: string;
  mentionedUserIds: string[];
}

export interface SocketTypingEventPayload {
  userId?: string;
  userName?: string;
  channel?: string;
  conversationId?: string;
}

export interface SocketPresenceUpdatePayload {
  userId: string;
  status: PresenceStatus;
  customStatus?: string;
}

export interface SocketMessageReadPayload {
  messageId: string;
  userId?: string;
  channelId?: string;
  conversationId?: string;
  readAt?: string;
}

export interface SocketMessageSyncPayload {
  messages: ConnectMessage[];
  since: string;
}


