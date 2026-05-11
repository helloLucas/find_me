import { create } from "zustand";

export interface CallOverlayMessage {
  speaker: string;
  channel: string;
  text: string;
}

export interface CallOverlayButton {
  label: string;
  value: string;
}

interface CallOverlayPayload {
  nodeCode: string;
  title: string;
  status?: string;
  messages: CallOverlayMessage[];
  buttons: CallOverlayButton[];
}

interface CallOverlayState {
  isVisible: boolean;
  isRinging: boolean;
  nodeCode: string | null;
  title: string;
  status?: string;
  messages: CallOverlayMessage[];
  buttons: CallOverlayButton[];
  openCallOverlay: (payload: CallOverlayPayload) => void;
  closeCallOverlay: () => void;
  setRinging: (isRinging: boolean) => void;
  resetCallOverlay: () => void;
}

const INITIAL_STATE = {
  isVisible: false,
  isRinging: false,
  nodeCode: null,
  title: "",
  status: undefined,
  messages: [],
  buttons: [],
};

export const useCallOverlayStore = create<CallOverlayState>((set) => ({
  ...INITIAL_STATE,

  openCallOverlay: (payload) =>
    set({
      isVisible: true,
      nodeCode: payload.nodeCode,
      title: payload.title,
      status: payload.status,
      messages: payload.messages,
      buttons: payload.buttons,
    }),

  closeCallOverlay: () =>
    set({
      isVisible: false,
      isRinging: false,
    }),

  setRinging: (isRinging) =>
    set({
      isRinging,
    }),

  resetCallOverlay: () =>
    set({
      ...INITIAL_STATE,
    }),
}));
