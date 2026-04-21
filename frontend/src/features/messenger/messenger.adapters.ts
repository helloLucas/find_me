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
    senderName: String(m.senderName ?? "FRIEND"),
    senderAvatar: stringValue(m.senderAvatar) ?? stringValue(raw.senderAvatar),
    text: resolveStoryText(m.text, textContext),
    timestampLabel: stringValue(m.timestamp) ?? stringValue(m.timestampLabel),
  }));

  const actions = normalizeMessengerActions(recordArray(raw.actions));

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
  bundle: ReturnType<typeof normalizeStoryOutputBundle>,
  node: Pick<StoryNode, "code"> | undefined,
  textContext: StoryTextResolveContext
): MessengerConversation | null {
  const chatMessages = bundle.messages.filter((message) => message.channel === "chat");

  if (chatMessages.length === 0) return null;

  const chatNotification = bundle.notifications.find((notification) => notification.type === "chat");
  const friendMessage = objectRecord(bundle.content.friendMessage);
  const nodeCode = node?.code ?? String(bundle.scene.id ?? `story-${Date.now()}`);

  const messages: MessengerMessage[] = chatMessages.map((message, idx) => ({
    id: `${nodeCode}-msg-${idx}`,
    senderId: String(message.speaker ?? "friend").toLowerCase(),
    senderName: String(message.speaker ?? "FRIEND"),
    text: resolveStoryText(message.text, textContext),
    timestampLabel: String(message.timestamp ?? "오후 10:17"),
  }));

  const actions = normalizeMessengerActions(bundle.actions) ?? createStoryActions(nodeCode, friendMessage);

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

function normalizeMessengerActions(
  rawActions: Record<string, unknown>[]
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
    payload: action.payload ?? action.meta ?? action,
  }));
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
