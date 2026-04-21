// ── Messenger Types ──
// Normalized ViewModel types for messenger UI rendering.
// These are decoupled from the raw backend outputBundle schema.

export type MessengerMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestampLabel?: string;
};

export type MessengerAction = {
  label: string;
  actionType: string;
  payload?: unknown;
};

export type MessengerConversation = {
  conversationId: string;
  title: string;
  subtitle?: string;
  online?: boolean;
  unread: boolean;
  messages: MessengerMessage[];
  actions?: MessengerAction[];
};
