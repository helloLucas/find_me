import { create } from "zustand";
import type { MessengerConversation } from "../../features/messenger/messenger.types";

interface MessengerState {
  conversation: MessengerConversation | null;
  isNotificationVisible: boolean;
  isWindowOpen: boolean;
  isUnread: boolean;
  hasUserOpened: boolean;
  shouldResetPosition: boolean;

  receiveConversation: (conv: MessengerConversation) => void;
  openMessengerWindow: () => void;
  openMessengerFromTaskbar: () => void;
  closeMessengerWindow: () => void;
  dismissNotification: () => void;
  resetMessenger: () => void;
}

export const useMessengerStore = create<MessengerState>((set) => ({
  conversation: null,
  isNotificationVisible: false,
  isWindowOpen: false,
  isUnread: false,
  hasUserOpened: false,
  shouldResetPosition: false,

  receiveConversation: (conv) =>
    set((state) => {
      const shouldKeepWindowOpen = state.isWindowOpen;

      return {
        conversation: conv,
        isNotificationVisible: !shouldKeepWindowOpen,
        isUnread: !shouldKeepWindowOpen,
        isWindowOpen: shouldKeepWindowOpen,
        hasUserOpened: shouldKeepWindowOpen ? true : false,
        shouldResetPosition: shouldKeepWindowOpen ? false : true,
      };
    }),

  openMessengerWindow: () =>
    set({
      isWindowOpen: true,
      isUnread: false,
      isNotificationVisible: false,
      hasUserOpened: true,
    }),

  openMessengerFromTaskbar: () =>
    set({
      isWindowOpen: true,
      isUnread: false,
      hasUserOpened: true,
      shouldResetPosition: true,
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
      conversation: null,
      isNotificationVisible: false,
      isWindowOpen: false,
      isUnread: false,
      hasUserOpened: false,
      shouldResetPosition: false,
    }),
}));
