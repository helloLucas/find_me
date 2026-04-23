import { create } from "zustand";

type BrowserContent = Record<string, unknown>;

interface BrowserContentState {
  content: BrowserContent;
  isRelayClueUnlocked: boolean;
  mergeContent: (content?: BrowserContent | null) => void;
  setRelayClueUnlocked: (unlocked: boolean) => void;
  resetContent: () => void;
}

export const useBrowserContentStore = create<BrowserContentState>((set) => ({
  content: {},
  isRelayClueUnlocked: false,
  mergeContent: (content) => {
    if (!content) return;
    set((state) => ({
      content: {
        ...state.content,
        ...content,
      },
    }));
  },
  setRelayClueUnlocked: (unlocked) => set({ isRelayClueUnlocked: unlocked }),
  resetContent: () => set({ content: {}, isRelayClueUnlocked: false }),
}));
