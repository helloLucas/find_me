import { create } from "zustand";
import type { MessengerConversation } from "../../features/messenger/messenger.types";

interface MessengerState {
  conversations: Record<string, MessengerConversation>;
  activeRoomId: string | null;
  isNotificationVisible: boolean;
  isWindowOpen: boolean;
  isUnread: boolean;
  hasUserOpened: boolean;
  shouldResetPosition: boolean;
  messengerZIndex: number;

  receiveConversation: (conv: MessengerConversation) => void;
  openMessengerWindow: () => void;
  openMessengerFromTaskbar: () => void;
  closeMessengerWindow: () => void;
  dismissNotification: () => void;
  resetMessenger: () => void;
  focusMessenger: () => void;
  setActiveRoom: (roomId: string) => void;
}

let nextMessengerZIndex = 9000;

export const useMessengerStore = create<MessengerState>((set) => ({
  conversations: {},
  activeRoomId: null,
  isNotificationVisible: false,
  isWindowOpen: false,
  isUnread: false,
  hasUserOpened: false,
  shouldResetPosition: false,
  messengerZIndex: nextMessengerZIndex,

  receiveConversation: (conv) =>
    set((state) => {
      const shouldKeepWindowOpen = state.isWindowOpen;
      const roomId = conv.conversationId;

      const existingRoom = state.conversations[roomId];
      const existingMessages = existingRoom ? existingRoom.messages : [];

      // 중복 메시지 방지 (이미 존재하는 텍스트라면 무시)
      const newMessages = conv.messages.filter(
        (newMsg) => !existingMessages.some((msg) => msg.text === newMsg.text)
      );

      const mergedMessages = [
        ...existingMessages,
        ...newMessages
      ];

      // 새 메시지 수신 시 자동으로 해당 방으로 포커싱하거나 누적
      return {
        messengerZIndex: ++nextMessengerZIndex,
        conversations: {
          ...state.conversations,
          [roomId]: {
            ...conv,
            messages: mergedMessages
          }
        },
        activeRoomId: roomId,
        isNotificationVisible: !shouldKeepWindowOpen,
        isUnread: !shouldKeepWindowOpen,
        isWindowOpen: shouldKeepWindowOpen,
        hasUserOpened: shouldKeepWindowOpen ? true : false,
        shouldResetPosition: shouldKeepWindowOpen ? false : true,
      };
    }),

  setActiveRoom: (roomId) =>
    set({
      activeRoomId: roomId,
    }),

  openMessengerWindow: () =>
    set({
      isWindowOpen: true,
      isUnread: false,
      isNotificationVisible: false,
      hasUserOpened: true,
      messengerZIndex: ++nextMessengerZIndex,
    }),

  openMessengerFromTaskbar: () =>
    set({
      isWindowOpen: true,
      isUnread: false,
      hasUserOpened: true,
      shouldResetPosition: true,
      messengerZIndex: ++nextMessengerZIndex,
    }),

  closeMessengerWindow: () =>
    set({
      isWindowOpen: false,
      isNotificationVisible: false,
    }),

  dismissNotification: () =>
    set({
      isNotificationVisible: false,
    }),

  resetMessenger: () =>
    set({
      conversations: {},
      activeRoomId: null,
      isNotificationVisible: false,
      isWindowOpen: false,
      isUnread: false,
      hasUserOpened: false,
      shouldResetPosition: false,
      messengerZIndex: 9000,
    }),

  focusMessenger: () =>
    set({
      messengerZIndex: ++nextMessengerZIndex,
    }),
}));
