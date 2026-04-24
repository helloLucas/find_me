import { create } from "zustand";
import type { MessengerConversation } from "../../features/messenger/messenger.types";

function hasUnreadConversations(conversations: Record<string, MessengerConversation>) {
  return Object.values(conversations).some((conversation) => conversation.unread);
}

function clearConversationUnread(
  conversations: Record<string, MessengerConversation>,
  roomId: string | null
) {
  if (!roomId || !conversations[roomId]) {
    return conversations;
  }

  return {
    ...conversations,
    [roomId]: {
      ...conversations[roomId],
      unread: false,
    },
  };
}

interface MessengerState {
  conversations: Record<string, MessengerConversation>;
  activeRoomId: string | null;
  isNotificationVisible: boolean;
  isUnread: boolean;
  receiveConversation: (conv: MessengerConversation) => void;
  dismissNotification: () => void;
  markMessengerSeen: () => void;
  resetMessenger: () => void;
  setActiveRoom: (roomId: string) => void;
}

export const useMessengerStore = create<MessengerState>((set) => ({
  conversations: {},
  activeRoomId: null,
  isNotificationVisible: false,
  isUnread: false,

  receiveConversation: (conv) =>
    set((state) => {
      const roomId = conv.conversationId;
      const existingRoom = state.conversations[roomId];
      const existingMessages = existingRoom ? existingRoom.messages : [];
      const newMessages = conv.messages.filter(
        (newMsg) => !existingMessages.some((msg) => msg.text === newMsg.text)
      );
      const mergedMessages = [...existingMessages, ...newMessages];
      const nextRoomUnread =
        newMessages.length > 0 ? true : existingRoom?.unread ?? conv.unread;
      const nextConversations = {
        ...state.conversations,
        [roomId]: {
          ...conv,
          messages: mergedMessages,
          unread: nextRoomUnread,
        },
      };

      return {
        conversations: nextConversations,
        activeRoomId: roomId,
        isNotificationVisible:
          newMessages.length > 0 ? true : state.isNotificationVisible,
        isUnread: hasUnreadConversations(nextConversations),
      };
    }),

  dismissNotification: () =>
    set({
      isNotificationVisible: false,
    }),

  markMessengerSeen: () =>
    set((state) => {
      const conversations = clearConversationUnread(state.conversations, state.activeRoomId);

      return {
        conversations,
        isNotificationVisible: false,
        isUnread: hasUnreadConversations(conversations),
      };
    }),

  resetMessenger: () =>
    set({
      conversations: {},
      activeRoomId: null,
      isNotificationVisible: false,
      isUnread: false,
    }),

  setActiveRoom: (roomId) =>
    set((state) => {
      const conversations = clearConversationUnread(state.conversations, roomId);

      return {
        conversations,
        activeRoomId: roomId,
        isNotificationVisible: false,
        isUnread: hasUnreadConversations(conversations),
      };
    }),
}));
