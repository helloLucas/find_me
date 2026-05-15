import type { MessengerAction, MessengerConversation, MessengerMessage } from "./messenger.types";
import type { StoryNode } from "../../shared/types/story";
import {
  normalizeStoryOutputBundle,
  objectRecord,
  recordArray,
  resolveStoryText,
  stringValue,
  type StoryTextResolveContext,
} from "../story-runtime/outputBundle.adapters";

const SPEAKER_DISPLAY_NAMES: Record<string, string> = {
  FRIEND: "\uCE5C\uAD6C",
};

function toMessengerDisplayName(value: unknown, fallback = "FRIEND") {
  const raw = String(value ?? fallback);
  return SPEAKER_DISPLAY_NAMES[raw.trim().toUpperCase()] ?? raw;
}

function formatMessengerTimestamp(date = new Date()) {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours < 12 ? "\uC624\uC804" : "\uC624\uD6C4";
  const displayHour = hours % 12 || 12;
  return `${period} ${displayHour}:${minutes}`;
}

function resolveTimestampLabel(record: Record<string, unknown>, fallbackTimestamp: string) {
  return stringValue(record.timestamp) ?? stringValue(record.timestampLabel) ?? fallbackTimestamp;
}

/**
 * 백엔드 outputBundle을 메신저 UI가 바로 렌더링할 수 있는 대화 모델로 변환한다.
 * 원본 outputBundle 구조를 직접 만지는 위치는 이 adapter로 제한한다.
 */
export function normalizeMessengerBundle(
  outputBundle: unknown,
  node?: Pick<StoryNode, "code">,
  textContext: StoryTextResolveContext = {}
): MessengerConversation | null {
  if (!outputBundle || typeof outputBundle !== "object") return null;

  const fallbackTimestamp = formatMessengerTimestamp();
  const bundle = normalizeStoryOutputBundle(outputBundle);
  const raw = objectRecord(bundle.raw.messenger);

  if (!raw || typeof raw !== "object") {
    return normalizeTopLevelStoryMessages(bundle, node, textContext);
  }

  const rawMessages = raw.messages;
  let messageArray: Record<string, unknown>[] = [];

  if (Array.isArray(rawMessages)) {
    messageArray = recordArray(rawMessages);
  } else if (rawMessages && typeof rawMessages === "object") {
    const singleMessage = objectRecord(rawMessages);
    messageArray = singleMessage ? [singleMessage] : [];
  }

  if (messageArray.length === 0) return null;

  const messages: MessengerMessage[] = messageArray.map((m, idx) => ({
    id: String(m.id ?? `msg-${Date.now()}-${idx}`),
    senderId: String(m.senderId ?? "unknown"),
    senderName: toMessengerDisplayName(m.senderName),
    senderAvatar: stringValue(m.senderAvatar) ?? stringValue(raw.senderAvatar),
    text: resolveStoryText(m.text, textContext),
    timestampLabel: resolveTimestampLabel(m, fallbackTimestamp),
  }));

  const actions = normalizeMessengerActions(recordArray(raw.actions), fallbackTimestamp);

  return {
    conversationId: String(raw.conversationId ?? `conv-${Date.now()}`),
    title: toMessengerDisplayName(raw.title),
    subtitle: raw.subtitle != null ? String(raw.subtitle) : undefined,
    online: raw.online === true,
    unread: true,
    messages,
    actions,
  };
}

function normalizeTopLevelStoryMessages(
  bundle: ReturnType<typeof normalizeStoryOutputBundle>,
  node: Pick<StoryNode, "code"> | undefined,
  textContext: StoryTextResolveContext
): MessengerConversation | null {
  const chatMessages = bundle.messages.filter((message) => message.channel === "chat");

  if (chatMessages.length === 0) return null;

  const chatNotification = bundle.notifications.find((notification) => notification.type === "chat");
  const friendMessage = objectRecord(bundle.content.friendMessage);
  const nodeCode = node?.code ?? String(bundle.scene.id ?? `story-${Date.now()}`);
  const speaker = String(chatMessages[0]?.speaker ?? "FRIEND").toUpperCase();
  const fallbackTimestamp = formatMessengerTimestamp();

  const messages: MessengerMessage[] = chatMessages.map((message, idx) => ({
    id: `${nodeCode}-msg-${idx}`,
    senderId: String(message.speaker ?? "friend").toLowerCase(),
    senderName: toMessengerDisplayName(message.speaker ?? speaker),
    text: resolveStoryText(message.text, textContext),
    timestampLabel: resolveTimestampLabel(message, fallbackTimestamp),
  }));

  const actions = normalizeMessengerActions(bundle.actions, fallbackTimestamp) ?? createStoryActions(nodeCode, friendMessage, fallbackTimestamp);

  return {
    conversationId: `conv-${speaker}`,
    title: chatNotification?.title != null ? String(chatNotification.title) : toMessengerDisplayName(speaker),
    subtitle: chatNotification?.body != null ? String(chatNotification.body) : undefined,
    online: true,
    unread: true,
    messages,
    actions,
  };
}

function normalizeMessengerActions(
  rawActions: Record<string, unknown>[],
  fallbackTimestamp: string
): MessengerAction[] | undefined {
  if (rawActions.length === 0) return undefined;

  return rawActions.map((action) => ({
    label: stringValue(action.label) ?? stringValue(action.text) ?? stringValue(action.title) ?? "열기",
    actionType:
      stringValue(action.inputValue) ??
      stringValue(action.actionValue) ??
      stringValue(action.actionType) ??
      stringValue(action.type) ??
      "noop",
    timestampLabel: resolveTimestampLabel(action, fallbackTimestamp),
    payload: action.payload ?? action.meta ?? action,
  }));
}

function createStoryActions(
  nodeCode: string,
  friendMessage: Record<string, unknown> | undefined,
  fallbackTimestamp: string
): MessengerAction[] | undefined {
  if (nodeCode === "CH1_FRIEND_CHAT_PUSH") {
    return [{ label: "채팅 열기", actionType: "open_friend_chat", timestampLabel: fallbackTimestamp }];
  }

  if (nodeCode === "CH1_FRIEND_CHAT_OPEN") {
    return [
      {
        label: String(friendMessage?.linkLabel ?? "링크 열기"),
        actionType: "friend_message_link",
        timestampLabel:
          stringValue(friendMessage?.linkTimestamp) ??
          stringValue(friendMessage?.linkTimestampLabel) ??
          fallbackTimestamp,
      },
    ];
  }

  return undefined;
}
