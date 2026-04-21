import type { MessengerConversation, MessengerMessage, MessengerAction } from "./messenger.types";

/**
 * Normalize a raw outputBundle from StoryNodeResponseDto into a MessengerConversation.
 * This adapter is the ONLY place that touches the raw backend shape.
 * If the backend schema changes, only this function needs updating.
 *
 * Expected raw shape (flexible):
 * {
 *   messenger?: {
 *     conversationId?: string;
 *     title?: string;
 *     subtitle?: string;
 *     online?: boolean;
 *     senderAvatar?: string;
 *     messages?: Array<{ senderId?, senderName?, text?, timestamp? }> | { senderId?, senderName?, text?, timestamp? };
 *     actions?: Array<{ label, actionType, payload? }>;
 *   }
 * }
 */
export function normalizeMessengerBundle(
  outputBundle: unknown
): MessengerConversation | null {
  if (!outputBundle || typeof outputBundle !== "object") return null;

  const bundle = outputBundle as Record<string, unknown>;
  const raw = bundle.messenger as Record<string, unknown> | undefined;

  if (!raw || typeof raw !== "object") return null;

  // ── Parse messages ──
  const rawMessages = raw.messages;
  let messageArray: unknown[] = [];

  if (Array.isArray(rawMessages)) {
    messageArray = rawMessages;
  } else if (rawMessages && typeof rawMessages === "object") {
    // Single message object → wrap in array
    messageArray = [rawMessages];
  }

  if (messageArray.length === 0) return null;

  const messages: MessengerMessage[] = messageArray.map((m, idx) => {
    const msg = (m && typeof m === "object" ? m : {}) as Record<string, unknown>;
    return {
      id: String(msg.id ?? `msg-${Date.now()}-${idx}`),
      senderId: String(msg.senderId ?? "unknown"),
      senderName: String(msg.senderName ?? "알 수 없음"),
      senderAvatar: msg.senderAvatar != null ? String(msg.senderAvatar) : (raw.senderAvatar != null ? String(raw.senderAvatar) : undefined),
      text: String(msg.text ?? ""),
      timestampLabel: msg.timestamp != null ? String(msg.timestamp) : (msg.timestampLabel != null ? String(msg.timestampLabel) : undefined),
    };
  });

  // ── Parse actions ──
  const rawActions = raw.actions;
  let actions: MessengerAction[] | undefined;
  if (Array.isArray(rawActions)) {
    actions = rawActions
      .filter((a): a is Record<string, unknown> => a && typeof a === "object")
      .map((a) => ({
        label: String(a.label ?? "액션"),
        actionType: String(a.actionType ?? "noop"),
        payload: a.payload,
      }));
  }

  return {
    conversationId: String(raw.conversationId ?? `conv-${Date.now()}`),
    title: String(raw.title ?? "새 메시지"),
    subtitle: raw.subtitle != null ? String(raw.subtitle) : undefined,
    online: raw.online === true,
    unread: true,
    messages,
    actions,
  };
}
