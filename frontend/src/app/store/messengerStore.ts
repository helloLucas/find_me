import { create } from "zustand";
import { useWindowStore } from "./windowStore";
import type { MessengerConversation } from "../../features/messenger/messenger.types";

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
      const messengerWindow = useWindowStore
        .getState()
        .windows.find((windowState) => windowState.id === "messenger");
      const isMessengerVisible = Boolean(messengerWindow && !messengerWindow.isMinimized);

      return {
        conversations: {
          ...state.conversations,
          [roomId]: {
            ...conv,
            messages: mergedMessages,
          },
        },
        activeRoomId: roomId,
        isNotificationVisible: !isMessengerVisible,
        isUnread: !isMessengerVisible,
      };
    }),

  dismissNotification: () =>
    set({
      isNotificationVisible: false,
    }),

  markMessengerSeen: () =>
    set({
      isNotificationVisible: false,
      isUnread: false,
    }),

  resetMessenger: () =>
    set({
      conversations: {},
      activeRoomId: null,
      isNotificationVisible: false,
      isUnread: false,
    }),

  setActiveRoom: (roomId) =>
    set({
      activeRoomId: roomId,
    }),
}));
