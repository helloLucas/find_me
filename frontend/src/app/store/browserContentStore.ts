import { create } from "zustand";

type BrowserContent = Record<string, unknown>;

interface BrowserContentState {
  content: BrowserContent;
  isRelayClueUnlocked: boolean;
  isChapter2Mode: boolean; // 챕터 2 모드 여부
  lastCopiedCommand: string | null; // 브라우저에서 복사된 마지막 커맨드
  newsTabClickTrigger: number; // 기사 추가 클릭 트리거
  newsScrollTop: number; // 뉴스 탭 스크롤 위치 저장
  mergeContent: (content?: BrowserContent | null) => void;
  setRelayClueUnlocked: (unlocked: boolean) => void;
  setIsChapter2Mode: (active: boolean) => void; // 챕터 2 모드 설정
  setLastCopiedCommand: (command: string | null) => void; // 복사된 커맨드 저장
  triggerNewsTabClick: () => void; // 기사 추가 클릭 트리거 증가 함수
  setNewsScrollTop: (scrollTop: number) => void; // 뉴스 탭 스크롤 위치 설정 함수
  resetContent: () => void;
}

export const useBrowserContentStore = create<BrowserContentState>((set) => ({
  content: {},
  isRelayClueUnlocked: false,
  isChapter2Mode: false,
  newsTabClickTrigger: 0,
  newsScrollTop: 0,
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
  triggerNewsTabClick: () => set((state) => ({ newsTabClickTrigger: state.newsTabClickTrigger + 1 })),
  setNewsScrollTop: (scrollTop) => set({ newsScrollTop: scrollTop }),
  resetContent: () => set({ content: {}, isRelayClueUnlocked: false, isChapter2Mode: false, lastCopiedCommand: null, newsTabClickTrigger: 0, newsScrollTop: 0 }),
}));
