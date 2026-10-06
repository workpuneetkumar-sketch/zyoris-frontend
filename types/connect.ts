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

export type MessageDeliveryStatus = "sending" | "sent" | "failed";

export interface MessageAttachment {
  id?: string;
  name: string;
  url?: string;
  size?: number; // bytes
  mimeType?: string;
  fileType?: string;
  type?: string;
  fileUploadId?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
  hasReacted?: boolean;
}

export type BusinessLinkTargetType =
  | "TASK"
  | "LEAD"
  | "DEAL"
  | "MEETING"
  | "PROJECT"
  | "DOCUMENT";

export interface BusinessEntityLink {
  id: string;
  messageId: string;
  targetType: BusinessLinkTargetType | string;
  targetId: string;
  metadata?: {
    title?: string;
    description?: string;
    status?: string;
    url?: string;
    [key: string]: any;
  } | null;
  createdAt?: string;
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
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  links?: BusinessEntityLink[];
  replyCount?: number;
  lastReplyAt?: string | null;
  isPinned?: boolean;
  isSaved?: boolean;
  mentionedUserIds?: string[];
  // Optimistic client fields
  status?: MessageDeliveryStatus;
  error?: string;
  clientMessageId?: string;
}

export interface SendMessagePayload {
  channelId?: string;
  conversationId?: string;
  content: string;
  parentMessageId?: string | null;
  attachments?: MessageAttachment[];
  mentionedUserIds?: string[];
}

export interface SendReplyPayload {
  content: string;
  attachments?: MessageAttachment[];
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

export interface SearchCommunicationsParams {
  q: string;
  channelId?: string;
  conversationId?: string;
  limit?: number;
  cursor?: string;
}

export interface SearchMessageResult {
  id: string;
  content: string;
  createdAt: string;
  channelId?: string | null;
  conversationId?: string | null;
  channelName?: string | null;
  conversationName?: string | null;
  sender?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
  };
  attachments?: MessageAttachment[];
  parentMessageId?: string | null;
}

export interface UnreadStateResponse {
  channels?: Record<string, number>;
  conversations?: Record<string, number>;
  total?: number;
}

export type MessageActionType =
  | "reply"
  | "edit"
  | "delete"
  | "react"
  | "mention"
  | "pin"
  | "unpin"
  | "save"
  | "unsave"
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

export interface SocketChannelReadPayload {
  channelId: string;
  userId?: string;
  readAt?: string;
}

export interface SocketConversationReadPayload {
  conversationId: string;
  userId?: string;
  readAt?: string;
}

export interface SocketMessageReadPayload {
  messageId?: string;
  channelId?: string | null;
  conversationId?: string | null;
  userId?: string;
  readAt?: string;
}

export interface SocketReactionPayload {
  messageId: string;
  channelId?: string | null;
  conversationId?: string | null;
  emoji: string;
  userId: string;
  action?: "add" | "remove";
  reactions?: MessageReaction[];
}

export interface SocketPinPayload {
  messageId: string;
  channelId?: string | null;
  conversationId?: string | null;
  isPinned: boolean;
}


