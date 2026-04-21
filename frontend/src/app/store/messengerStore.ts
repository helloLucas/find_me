import { create } from "zustand";
import type { MessengerConversation } from "../../features/messenger/messenger.types";

interface MessengerState {
  conversation: MessengerConversation | null;
  isNotificationVisible: boolean;
  isWindowOpen: boolean;
  isUnread: boolean;
  hasUserOpened: boolean;
  shouldResetPosition: boolean;

  // Actions
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
    set({
      conversation: conv,
      isNotificationVisible: true,
      isUnread: true,
      isWindowOpen: false,
      hasUserOpened: false,
      shouldResetPosition: true,
    }),

  // Open from notification card click (keeps last drag position if any)
  openMessengerWindow: () =>
    set({
      isWindowOpen: true,
      isUnread: false,
      isNotificationVisible: false,
      hasUserOpened: true,
    }),

  // Open from taskbar button: always reset to center
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
