import { create } from "zustand";

export interface NotepadTab {
  id: string;
  title: string;
  content: string;
}

interface NotepadState {
  tabs: Record<string, NotepadTab[]>; // chapterCode 별 탭 관리
  activeTabId: Record<string, string>; // chapterCode 별 활성 탭 ID
  
  // Actions
  addTab: (chapterCode: string, title: string, content: string) => void;
  updateTabContent: (chapterCode: string, tabId: string, content: string) => void;
  updateTabTitle: (chapterCode: string, tabId: string, title: string) => void;
  removeTab: (chapterCode: string, tabId: string) => void;
  setActiveTabId: (chapterCode: string, tabId: string) => void;
  resetNotepad: () => void;
}

export const useNotepadStore = create<NotepadState>((set) => ({
  tabs: {},
  activeTabId: {},

  addTab: (chapterCode, title, content) =>
    set((state) => {
      const chapterTabs = state.tabs[chapterCode] || [];
      const newTab = { id: `tab-${Date.now()}`, title, content };
      return {
        tabs: { ...state.tabs, [chapterCode]: [...chapterTabs, newTab] },
        activeTabId: { ...state.activeTabId, [chapterCode]: newTab.id },
      };
    }),

  updateTabContent: (chapterCode, tabId, content) =>
    set((state) => {
      const chapterTabs = state.tabs[chapterCode] || [];
      const updatedTabs = chapterTabs.map((tab) =>
        tab.id === tabId ? { ...tab, content } : tab
      );
      return {
        tabs: { ...state.tabs, [chapterCode]: updatedTabs },
      };
    }),

  updateTabTitle: (chapterCode, tabId, title) =>
    set((state) => {
      const chapterTabs = state.tabs[chapterCode] || [];
      const updatedTabs = chapterTabs.map((tab) =>
        tab.id === tabId ? { ...tab, title } : tab
      );
      return {
        tabs: { ...state.tabs, [chapterCode]: updatedTabs },
      };
    }),

  removeTab: (chapterCode, tabId) =>
    set((state) => {
      const chapterTabs = state.tabs[chapterCode] || [];
      const filteredTabs = chapterTabs.filter((tab) => tab.id !== tabId);
      
      // 만약 삭제한 탭이 활성화된 탭이었다면 다른 탭으로 변경
      let nextActiveId = state.activeTabId[chapterCode];
      if (nextActiveId === tabId) {
        if (filteredTabs.length > 0) {
          nextActiveId = filteredTabs[filteredTabs.length - 1].id;
        } else {
          nextActiveId = "";
        }
      }

      return {
        tabs: { ...state.tabs, [chapterCode]: filteredTabs },
        activeTabId: { ...state.activeTabId, [chapterCode]: nextActiveId },
      };
    }),

  setActiveTabId: (chapterCode, tabId) =>
    set((state) => ({
      activeTabId: { ...state.activeTabId, [chapterCode]: tabId },
    })),

  resetNotepad: () => set({ tabs: {}, activeTabId: {} }),
}));
