import { create } from "zustand";

type BrowserContent = Record<string, unknown>;

interface BrowserContentState {
  content: BrowserContent;
  isRelayClueUnlocked: boolean;
  isChapter2Mode: boolean; // 챕터 2 모드 여부
  lastCopiedCommand: string | null; // 브라우저에서 복사된 마지막 커맨드
  mergeContent: (content?: BrowserContent | null) => void;
  setRelayClueUnlocked: (unlocked: boolean) => void;
  setIsChapter2Mode: (active: boolean) => void; // 챕터 2 모드 설정
  setLastCopiedCommand: (command: string | null) => void; // 복사된 커맨드 저장
  resetContent: () => void;
}

export const useBrowserContentStore = create<BrowserContentState>((set) => ({
  content: {},
  isRelayClueUnlocked: false,
  isChapter2Mode: false,
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
  setIsChapter2Mode: (active) => set({ isChapter2Mode: active }),
  lastCopiedCommand: null,
  setLastCopiedCommand: (command) => set({ lastCopiedCommand: command }),
  resetContent: () => set({ content: {}, isRelayClueUnlocked: false, isChapter2Mode: false, lastCopiedCommand: null }),
}));
