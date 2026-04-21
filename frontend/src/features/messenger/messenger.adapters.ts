import type { MessengerConversation, MessengerMessage, MessengerAction } from "./messenger.types";
import type { StoryNode } from "../../shared/types/story";

/**
 * 백엔드 outputBundle을 메신저 UI가 바로 렌더링할 수 있는 대화 모델로 변환한다.
 * 원본 outputBundle 구조를 직접 만지는 위치는 이 adapter로 제한한다.
 */
export function normalizeMessengerBundle(
  outputBundle: unknown,
  node?: Pick<StoryNode, "code">
): MessengerConversation | null {
  if (!outputBundle || typeof outputBundle !== "object") return null;

  const bundle = outputBundle as Record<string, unknown>;
  const raw = bundle.messenger as Record<string, unknown> | undefined;

  if (!raw || typeof raw !== "object") {
    return normalizeTopLevelStoryMessages(bundle, node);
  }

  const rawMessages = raw.messages;
  let messageArray: unknown[] = [];

  if (Array.isArray(rawMessages)) {
    messageArray = rawMessages;
  } else if (rawMessages && typeof rawMessages === "object") {
    messageArray = [rawMessages];
  }

  if (messageArray.length === 0) return null;

  const messages: MessengerMessage[] = messageArray.map((m, idx) => {
    const msg = (m && typeof m === "object" ? m : {}) as Record<string, unknown>;
    return {
      id: String(msg.id ?? `msg-${Date.now()}-${idx}`),
      senderId: String(msg.senderId ?? "unknown"),
      senderName: String(msg.senderName ?? "FRIEND"),
      senderAvatar: msg.senderAvatar != null ? String(msg.senderAvatar) : (raw.senderAvatar != null ? String(raw.senderAvatar) : undefined),
      text: String(msg.text ?? ""),
      timestampLabel: msg.timestamp != null ? String(msg.timestamp) : (msg.timestampLabel != null ? String(msg.timestampLabel) : undefined),
    };
  });

  const rawActions = raw.actions;
  let actions: MessengerAction[] | undefined;
  if (Array.isArray(rawActions)) {
    actions = rawActions
      .filter((a): a is Record<string, unknown> => a && typeof a === "object")
      .map((a) => ({
        label: String(a.label ?? "열기"),
        actionType: String(a.actionType ?? "noop"),
        payload: a.payload,
      }));
  }

  return {
    conversationId: String(raw.conversationId ?? `conv-${Date.now()}`),
    title: String(raw.title ?? "FRIEND"),
    subtitle: raw.subtitle != null ? String(raw.subtitle) : undefined,
    online: raw.online === true,
    unread: true,
    messages,
    actions,
  };
}

function normalizeTopLevelStoryMessages(
  bundle: Record<string, unknown>,
  node?: Pick<StoryNode, "code">
): MessengerConversation | null {
  const rawMessages = Array.isArray(bundle.messages) ? bundle.messages : [];
  const chatMessages = rawMessages.filter((message): message is Record<string, unknown> => {
    return Boolean(message && typeof message === "object" && (message as Record<string, unknown>).channel === "chat");
  });

  if (chatMessages.length === 0) return null;

  const rawNotifications = Array.isArray(bundle.notifications) ? bundle.notifications : [];
  const chatNotification = rawNotifications.find((notification): notification is Record<string, unknown> => {
    return Boolean(notification && typeof notification === "object" && (notification as Record<string, unknown>).type === "chat");
  });

  const content = objectRecord(bundle.content);
  const friendMessage = objectRecord(content?.friendMessage);
  const scene = objectRecord(bundle.scene);
  const nodeCode = node?.code ?? String(scene?.id ?? `story-${Date.now()}`);

  const messages: MessengerMessage[] = chatMessages.map((message, idx) => ({
    id: `${nodeCode}-msg-${idx}`,
    senderId: String(message.speaker ?? "friend").toLowerCase(),
    senderName: String(message.speaker ?? "FRIEND"),
    text: String(message.text ?? ""),
    timestampLabel: String(message.timestamp ?? "오후 10:17"),
  }));

  const actions = createStoryActions(nodeCode, friendMessage);

  return {
    conversationId: `conv-${nodeCode}`,
    title: String(chatNotification?.title ?? "FRIEND"),
    subtitle: chatNotification?.body != null ? String(chatNotification.body) : undefined,
    online: true,
    unread: true,
    messages,
    actions,
  };
}

function createStoryActions(
  nodeCode: string,
  friendMessage?: Record<string, unknown>
): MessengerAction[] | undefined {
  if (nodeCode === "CH1_FRIEND_CHAT_PUSH") {
    return [{ label: "채팅 열기", actionType: "open_friend_chat" }];
  }

  if (nodeCode === "CH1_FRIEND_CHAT_OPEN") {
    return [
      {
        label: String(friendMessage?.linkLabel ?? "링크 열기"),
        actionType: "friend_message_link",
      },
    ];
  }

  return undefined;
}

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}
