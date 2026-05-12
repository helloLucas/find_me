import { create } from "zustand";

type BrowserContent = Record<string, unknown>;

export interface SearchHistoryItem {
  query: string;
  time: string; // "HH:MM:SS" 형식
}

interface BrowserContentState {
  content: BrowserContent;
  isRelayClueUnlocked: boolean;
  isChapter2Mode: boolean; // 챕터 2 모드 여부
  lastCopiedCommand: string | null; // 브라우저에서 복사된 마지막 커맨드
  newsTabClickTrigger: number; // 기사 추가 클릭 트리거
  cyberPacketDashTabClickTrigger: number; // 사이버 패킷 대시 탭 추가 클릭 트리거
  lucasRouteTabClickTrigger: number;
  lucasSurvivalTabClickTrigger: number;
  newsScrollTop: number; // 뉴스 탭 스크롤 위치 저장
  searchHistory: SearchHistoryItem[]; // 챕터 3 전용 검색어 기록 저장소 (검색어 + 실제 검색시각)
  mergeContent: (content?: BrowserContent | null) => void;
  setRelayClueUnlocked: (unlocked: boolean) => void;
  setIsChapter2Mode: (active: boolean) => void; // 챕터 2 모드 설정
  setLastCopiedCommand: (command: string | null) => void; // 복사된 커맨드 저장
  triggerNewsTabClick: () => void; // 기사 추가 클릭 트리거 증가 함수
  resetNewsTabClickTrigger: () => void; // 기사 추가 클릭 트리거 초기화 함수
  triggerCyberPacketDashTabClick: () => void; // 사이버 패킷 대시 탭 추가 클릭 트리거 증가 함수
  resetCyberPacketDashTabClickTrigger: () => void; // 사이버 패킷 대시 탭 추가 클릭 트리거 초기화 함수
  triggerLucasRouteTabClick: () => void;
  resetLucasRouteTabClickTrigger: () => void;
  triggerLucasSurvivalTabClick: () => void;
  resetLucasSurvivalTabClickTrigger: () => void;
  setNewsScrollTop: (scrollTop: number) => void; // 뉴스 탭 스크롤 위치 설정 함수
  addSearchHistory: (query: string) => void; // 챕터 3 검색 기록 추가 액션 (실제 현재 시각 저장)
  resetSearchHistory: () => void; // 챕터 3 검색 기록 리셋 액션
  resetContent: () => void;
}

export const useBrowserContentStore = create<BrowserContentState>((set) => ({
  content: {},
  isRelayClueUnlocked: false,
  isChapter2Mode: false,
  newsTabClickTrigger: 0,
  cyberPacketDashTabClickTrigger: 0,
  lucasRouteTabClickTrigger: 0,
  lucasSurvivalTabClickTrigger: 0,
  newsScrollTop: 0,
  searchHistory: [],
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
  resetNewsTabClickTrigger: () => set({ newsTabClickTrigger: 0 }),
  triggerCyberPacketDashTabClick: () => set((state) => ({ cyberPacketDashTabClickTrigger: state.cyberPacketDashTabClickTrigger + 1 })),
  resetCyberPacketDashTabClickTrigger: () => set({ cyberPacketDashTabClickTrigger: 0 }),
  triggerLucasRouteTabClick: () => set((state) => ({ lucasRouteTabClickTrigger: state.lucasRouteTabClickTrigger + 1 })),
  resetLucasRouteTabClickTrigger: () => set({ lucasRouteTabClickTrigger: 0 }),
  triggerLucasSurvivalTabClick: () => set((state) => ({ lucasSurvivalTabClickTrigger: state.lucasSurvivalTabClickTrigger + 1 })),
  resetLucasSurvivalTabClickTrigger: () => set({ lucasSurvivalTabClickTrigger: 0 }),
  setNewsScrollTop: (scrollTop) => set({ newsScrollTop: scrollTop }),
  addSearchHistory: (query) => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const formattedTime = `${hours}:${minutes}:${seconds}`;

    set((state) => ({
      searchHistory: [{ query, time: formattedTime }, ...state.searchHistory]
    }));
  },
  resetSearchHistory: () => set({ searchHistory: [] }),
  resetContent: () => set({ content: {}, isRelayClueUnlocked: false, isChapter2Mode: false, lastCopiedCommand: null, newsTabClickTrigger: 0, cyberPacketDashTabClickTrigger: 0, lucasRouteTabClickTrigger: 0, lucasSurvivalTabClickTrigger: 0, newsScrollTop: 0, searchHistory: [] }),
}));
