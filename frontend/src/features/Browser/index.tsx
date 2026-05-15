import React, { useEffect, useRef, useState } from "react";
import { useWindowStore } from "../../app/store/windowStore";
import { useBrowserContentStore } from "../../app/store/browserContentStore";
import { NewsTab } from "./components/NewsTab";
import { HomeTab } from "./components/HomeTab";
import { SearchTab } from "./components/SearchTab";
import { PacmanTab } from "./components/PacmanTab";
import { StarforceTab } from "./components/StarforceTab";
import { HistoryTab } from "./components/HistoryTab";
import { DocTab } from "./components/DocTab";
import { CyberPacketDashTab } from "./components/CyberPacketDashTab";
import { LucasSurvivalTab } from "./components/LucasSurvivalTab";
import { LucasRouteTab } from "./components/LucasRouteTab";
import { NetworkDevTools } from "./components/NetworkDevTools";
import { ContextMenu } from "../../shared/ui/ContextMenu";
import { useStoryRuntimeStore } from "../story-runtime/storyRuntime.store";
import { type Chapter3Hint } from "./data/chapter3Hints";
import type { DesktopWindowId } from "../../shared/config/desktopWindows";
import {
  canSubmitStoryAction,
  getStoryInspectTarget,
} from "../story-runtime/storyActionGuards";

interface Tab {
  id: string;
  title: string;
  url: string;
  component: "news" | "home" | "pacman" | "starforce" | "history" | "doc" | "search" | "cardmatching" | "cyberpacketdash" | "lucasroute" | "lucassurvival";
  history: Array<{
    url: string;
    component: "news" | "home" | "pacman" | "starforce" | "history" | "doc" | "search" | "cardmatching" | "cyberpacketdash" | "lucasroute" | "lucassurvival";
    title: string;
  }>;
  historyIndex: number;
  currentView?: "home" | "history_list" | "search_result";
  selectedHint?: Chapter3Hint | null;
  detailOrigin?: "home" | "history_list" | null;
  currentSearchQuery?: string | null;
}

interface BrowserProps {
  windowId: DesktopWindowId;
}

type KeyboardLockNavigator = Navigator & {
  keyboard?: {
    lock?: (keys: string[]) => Promise<void>;
  };
};

export const Browser: React.FC<BrowserProps> = ({ windowId }) => {
  const { closeWindow, focusWindow } = useWindowStore();
  const { currentNode, submitStoryInspect } = useStoryRuntimeStore();
  const { content: browserContent, isChapter2Mode, setIsChapter2Mode, newsTabClickTrigger, cyberPacketDashTabClickTrigger, lucasRouteTabClickTrigger, lucasRouteStoryLinked, lucasSurvivalTabClickTrigger } = useBrowserContentStore();

  // 챕터 2 여부 감지 (최초 진입 시 1회만 설정)
  useEffect(() => {
    if (currentChapter === 2 && !isChapter2Mode) {
      setIsChapter2Mode(true);
    }
  }, [currentChapter, isChapter2Mode, setIsChapter2Mode]);

  // 챕터 3 여부 감지 (현재 노드 기준 실시간 판단)
  const isChapter3Mode = currentChapter === 3;

  // 챕터 4 여부 감지 (현재 노드 기준 실시간 판단)
  const isChapter4Mode = currentChapter === 4;

  // 챕터 3 전용 상태 및 더 보기 관리
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [hasClickedMoreBtn, setHasClickedMoreBtn] = useState(false);

  // 챕터 3가 아닐 때 전역 검색 기록 리셋 보조
  useEffect(() => {
    if (!isChapter3Mode) {
      useBrowserContentStore.getState().resetSearchHistory();
    }
  }, [isChapter3Mode]);

  // 더 보기 드롭다운 외부 클릭 감지용 ref
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 브라우저가 종료될 때(언마운트 시) 메신저 기사 추가 클릭 트리거 상태를 0으로 초기화
  useEffect(() => {
    return () => {
      useBrowserContentStore.getState().resetNewsTabClickTrigger();
      useBrowserContentStore.getState().resetCyberPacketDashTabClickTrigger();
      useBrowserContentStore.getState().resetLucasRouteTabClickTrigger();
      useBrowserContentStore.getState().resetLucasSurvivalTabClickTrigger();
    };
  }, []);

  const [tabs, setTabs] = useState<Tab[]>(() => {
    if (windowId === "terminal2") {
      return [{
        id: "tab1",
        title: "Starforce Core",
        url: "system://terminal2/starforce",
        component: "starforce",
        history: [{ url: "system://terminal2/starforce", component: "starforce", title: "Starforce Core" }],
        historyIndex: 0,
        currentView: "home",
        selectedHint: null,
        detailOrigin: null,
        currentSearchQuery: null,
      }];
    }

    const initialCardTrigger = useBrowserContentStore.getState().cyberPacketDashTabClickTrigger;
    if (initialCardTrigger > 0) {
      return [{
        id: "tab1",
        title: "Cyber Packet Dash",
        url: "system://cyberpacketdash",
        component: "cyberpacketdash" as const,
        history: [{ url: "system://cyberpacketdash", component: "cyberpacketdash" as const, title: "Cyber Packet Dash" }],
        historyIndex: 0,
        currentView: "home",
        selectedHint: null,
        detailOrigin: null,
        currentSearchQuery: null,
      }];
    }

    // 메신저 기사 클릭 트리거가 활성화된 경우, 기사 탭을 기본 첫 탭으로 노출하여 중복 생성 방지
    const initialTrigger = useBrowserContentStore.getState().newsTabClickTrigger;
    if (initialTrigger > 0) {
      const snapshot = resolveNewsSnapshot(currentNode?.code, typeof browserContent.articleTitle === "string" ? browserContent.articleTitle : undefined) || {
        url: "https://voidcity-news/recent/1",
        title: "News",
      };
      return [{
        id: "tab1",
        title: snapshot.title,
        url: snapshot.url,
        component: "news" as const,
        history: [{ url: snapshot.url, component: "news" as const, title: snapshot.title }],
        historyIndex: 0,
        currentView: "home",
        selectedHint: null,
        detailOrigin: null,
        currentSearchQuery: null,
      }];
    }

    // 챕터 2일 경우 히스토리 탭을 기본으로 노출
    if (currentNode?.code?.startsWith("CH2_")) {
      return [{
        id: "tab1",
        title: "History",
        url: "system://history",
        component: "history",
        history: [{ url: "system://history", component: "history", title: "History" }],
        historyIndex: 0,
        currentView: "home",
        selectedHint: null,
        detailOrigin: null,
        currentSearchQuery: null,
      }];
    }
    return [{
      id: "tab1",
      title: "Search",
      url: "https://void-search.net",
      component: "search",
      history: [{ url: "https://void-search.net", component: "search", title: "Search" }],
      historyIndex: 0,
      currentView: "home",
      selectedHint: null,
      detailOrigin: null,
      currentSearchQuery: null,
    }];
  });
  const [activeTabId, setActiveTabId] = useState("tab1");

  // 탭 전환 시 더 보기 드롭다운 메뉴 자동 폐쇄 처리
  useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [activeTabId]);

  const [showDevTools, setShowDevTools] = useState(false);
  const [devToolsWidth, setDevToolsWidth] = useState(320);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastAutoInspectNodeIdRef = useRef<number | null>(null);
  const skipAutoSyncNodeIdByTabRef = useRef<Record<string, number>>({});
  const lastSynchronizedNodeIdRef = useRef<number | null>(null);

  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  // 현재 활성 탭 상태 업데이트 헬퍼
  const updateActiveTab = (updates: Partial<Tab>) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId ? { ...tab, ...updates } : tab
      )
    );
  };

  // 챕터 3 전용 활성 탭의 개별 독립 상태 동적 바인딩
  const currentView = activeTab?.currentView ?? "home";
  const selectedHint = activeTab?.selectedHint ?? null;
  const detailOrigin = activeTab?.detailOrigin ?? null;
  const currentSearchQuery = activeTab?.currentSearchQuery ?? null;

  const articleTitleFromContent =
    typeof browserContent.articleTitle === "string" ? browserContent.articleTitle : undefined;

  const lastNewsTabClickTriggerRef = useRef(0);

  // 기사 링크 추가 클릭 시 해당 탭으로 강제 포커싱 및 갱신
  useEffect(() => {
    if (newsTabClickTrigger === 0) return;
    if (newsTabClickTrigger === lastNewsTabClickTriggerRef.current) return;
    lastNewsTabClickTriggerRef.current = newsTabClickTrigger;

    const snapshot = resolveNewsSnapshot(currentNode?.code, articleTitleFromContent) || {
      url: "https://voidcity-news/recent/1",
      title: "News",
    };

    setTabs((prev) => {
      const existingNewsTab = prev.find((tab) => tab.component === "news");
      if (existingNewsTab) {
        queueMicrotask(() => setActiveTabId(existingNewsTab.id));

        return prev.map((tab) => {
          if (tab.id !== existingNewsTab.id) return tab;

          if (tab.url !== snapshot.url) {
            const truncatedHistory = tab.history.slice(0, tab.historyIndex + 1);
            const nextHistory = [
              ...truncatedHistory,
              {
                url: snapshot.url,
                title: snapshot.title,
                component: "news" as const,
              },
            ];
            return {
              ...tab,
              url: snapshot.url,
              title: snapshot.title,
              history: nextHistory,
              historyIndex: nextHistory.length - 1,
            };
          }
          return tab;
        });
      }

      const newId = `tab_news_${Date.now()}`;
      const newTab = {
        id: newId,
        title: snapshot.title,
        url: snapshot.url,
        component: "news" as const,
        history: [{ url: snapshot.url, component: "news" as const, title: snapshot.title }],
        historyIndex: 0,
      };
      queueMicrotask(() => setActiveTabId(newId));
      return [...prev, newTab];
    });
  }, [newsTabClickTrigger, currentNode, articleTitleFromContent]);

  const lastCyberPacketDashTabClickTriggerRef = useRef(0);

  // 사이버 패킷 대시 링크 추가 클릭 시 해당 탭으로 강제 포커싱 및 생성
  useEffect(() => {
    if (cyberPacketDashTabClickTrigger === 0) return;
    if (cyberPacketDashTabClickTrigger === lastCyberPacketDashTabClickTriggerRef.current) return;
    lastCyberPacketDashTabClickTriggerRef.current = cyberPacketDashTabClickTrigger;

    setTabs((prev) => {
      const existingCardTab = prev.find((tab) => tab.component === "cyberpacketdash" || tab.component === "cardmatching");
      if (existingCardTab) {
        queueMicrotask(() => setActiveTabId(existingCardTab.id));
        return prev;
      }

      const newId = `tab_card_${Date.now()}`;
      const newTab = {
        id: newId,
        title: "Cyber Packet Dash",
        url: "system://cyberpacketdash",
        component: "cyberpacketdash" as const,
        history: [{ url: "system://cyberpacketdash", component: "cyberpacketdash" as const, title: "Cyber Packet Dash" }],
        historyIndex: 0,
      };
      queueMicrotask(() => setActiveTabId(newId));
      return [...prev, newTab];
    });
  }, [cyberPacketDashTabClickTrigger]);

  const lastLucasRouteTabClickTriggerRef = useRef(0);

  useEffect(() => {
    if (lucasRouteTabClickTrigger === 0) return;
    if (lucasRouteTabClickTrigger === lastLucasRouteTabClickTriggerRef.current) return;
    lastLucasRouteTabClickTriggerRef.current = lucasRouteTabClickTrigger;

    setTabs((prev) => {
      const existingTab = prev.find((tab) => tab.component === "lucasroute");
      if (existingTab) {
        queueMicrotask(() => setActiveTabId(existingTab.id));
        return prev;
      }

      const newId = `tab_lucasroute_${Date.now()}`;
      const newTab = {
        id: newId,
        title: "Lucas Route",
        url: "system://lucas-route",
        component: "lucasroute" as const,
        history: [{ url: "system://lucas-route", component: "lucasroute" as const, title: "Lucas Route" }],
        historyIndex: 0,
      };
      queueMicrotask(() => setActiveTabId(newId));
      return [...prev, newTab];
    });
  }, [lucasRouteTabClickTrigger]);

  const lastLucasSurvivalTabClickTriggerRef = useRef(0);

  useEffect(() => {
    if (lucasSurvivalTabClickTrigger === 0) return;
    if (lucasSurvivalTabClickTrigger === lastLucasSurvivalTabClickTriggerRef.current) return;
    lastLucasSurvivalTabClickTriggerRef.current = lucasSurvivalTabClickTrigger;

    setTabs((prev) => {
      const existingTab = prev.find((tab) => tab.component === "lucassurvival");
      if (existingTab) {
        queueMicrotask(() => setActiveTabId(existingTab.id));
        return prev;
      }

      const newId = `tab_lucassurvival_${Date.now()}`;
      const newTab = {
        id: newId,
        title: "Lucas Survival",
        url: "system://lucas-survival",
        component: "lucassurvival" as const,
        history: [{ url: "system://lucas-survival", component: "lucassurvival" as const, title: "Lucas Survival" }],
        historyIndex: 0,
      };
      queueMicrotask(() => setActiveTabId(newId));
      return [...prev, newTab];
    });
  }, [lucasSurvivalTabClickTrigger]);

  const handleNewTab = () => {
    const newId = `tab_${Date.now()}`;
    const isCh1 = currentChapter === 1;

    const newTab: Tab = isCh1
      ? {
        id: newId,
        title: "New Tab",
        url: "system://home",
        component: "home",
        history: [
          {
            url: "system://home",
            component: "home",
            title: "New Tab",
          },
        ],
        historyIndex: 0,
        currentView: "home",
        selectedHint: null,
        detailOrigin: null,
        currentSearchQuery: null,
      }
      : {
        id: newId,
        title: "Search",
        url: "https://void-search.net",
        component: "search",
        history: [
          {
            url: "https://void-search.net",
            component: "search",
            title: "Search",
          },
        ],
        historyIndex: 0,
        currentView: "home",
        selectedHint: null,
        detailOrigin: null,
        currentSearchQuery: null,
      };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const navigateTab = (id: string, url: string, component: Tab["component"], title: string) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== id) return tab;

        const nextEntry = { url, component, title };
        const currentEntry = tab.history[tab.historyIndex];

        if (
          currentEntry &&
          currentEntry.url === nextEntry.url &&
          currentEntry.component === nextEntry.component &&
          currentEntry.title === nextEntry.title
        ) {
          return tab;
        }

        const truncatedHistory = tab.history.slice(0, tab.historyIndex + 1);
        const nextHistory = [...truncatedHistory, nextEntry];

        return {
          ...tab,
          url,
          component,
          title,
          history: nextHistory,
          historyIndex: nextHistory.length - 1,
        };
      })
    );
  };

  const canGoBack = Boolean(activeTab && activeTab.historyIndex > 0);

  const handleBack = () => {
    if (!activeTab) return;
    if (activeTab.historyIndex <= 0) return;

    if (typeof currentNode?.id === "number") {
      skipAutoSyncNodeIdByTabRef.current[activeTab.id] = currentNode.id;
    }

    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTab.id) return tab;
        const nextIndex = tab.historyIndex - 1;
        const snapshot = tab.history[nextIndex];
        if (!snapshot) return tab;

        return {
          ...tab,
          url: snapshot.url,
          component: snapshot.component,
          title: snapshot.title,
          historyIndex: nextIndex,
        };
      })
    );
  };

  const openDevTools = () => {
    setShowDevTools(true);

    // DevTools 너비가 브라우저 전체 너비의 70%를 넘지 않도록 제한
    if (containerRef.current) {
      const maxAllowedWidth = containerRef.current.offsetWidth * 0.7;
      if (devToolsWidth > maxAllowedWidth) {
        setDevToolsWidth(Math.max(200, maxAllowedWidth));
      }
    }

    const inspectTarget = getStoryInspectTarget(currentNode);
    if (inspectTarget && canSubmitStoryAction(currentNode, "inspect", inspectTarget)) {
      void submitStoryInspect(inspectTarget);
    }
  };

  const toggleDevTools = () => {
    if (showDevTools) {
      setShowDevTools(false);
      return;
    }

    openDevTools();
  };

  const handleCloseTab = (id: string) => {
    setTabs((prev) => {
      const filtered = prev.filter((tab) => tab.id !== id);
      if (filtered.length === 0) {
        closeWindow(windowId);
        return [];
      }
      if (activeTabId === id) {
        setActiveTabId(filtered[filtered.length - 1].id);
      }
      return filtered;
    });
  };

  useEffect(() => {
    const keyboard = (navigator as KeyboardLockNavigator).keyboard;
    if (keyboard?.lock) {
      keyboard.lock(["ControlLeft", "KeyW", "ControlRight", "KeyW"]).catch(() => { });
    }

    const handleCaptureKeyDown = (event: KeyboardEvent) => {
      const activeWindowId = useWindowStore.getState().activeWindowId;
      if (activeWindowId !== windowId) return;

      const isModKey = event.ctrlKey || event.metaKey; // Mac에서는 Cmd(meta), Windows/Linux에서는 Ctrl
      const isW = event.key.toLowerCase() === "w";
      const isN = event.key.toLowerCase() === "n";
      const isT = event.key.toLowerCase() === "t";

      if (event.key === "F12") {
        event.preventDefault();
        event.stopPropagation();
        toggleDevTools();
        return;
      }

      if (!isModKey) return;

      if (isW) {
        event.preventDefault();
        event.stopPropagation();
        handleCloseTab(activeTabId);
      } else if (isN || isT) {
        event.preventDefault();
        event.stopPropagation();
        handleNewTab();
      }
    };

    window.addEventListener("keydown", handleCaptureKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleCaptureKeyDown, { capture: true });
  }, [activeTabId, currentNode, showDevTools, submitStoryInspect, windowId]);

  useEffect(() => {
    if (!showDevTools || !currentNode) return;

    const inspectTarget = getStoryInspectTarget(currentNode);
    if (inspectTarget !== "devtools_open") return;
    if (lastAutoInspectNodeIdRef.current === currentNode.id) return;

    if (canSubmitStoryAction(currentNode, "inspect", inspectTarget)) {
      lastAutoInspectNodeIdRef.current = currentNode.id;
      void submitStoryInspect(inspectTarget);
    }
  }, [currentNode, showDevTools, submitStoryInspect]);

  useEffect(() => {
    if (!currentNode || !activeTab) return;
    if (activeTab.component !== "news") return;

    const skipNodeId = skipAutoSyncNodeIdByTabRef.current[activeTab.id];
    if (typeof skipNodeId === "number") {
      if (skipNodeId === currentNode.id) return;
      delete skipAutoSyncNodeIdByTabRef.current[activeTab.id];
    }

    const snapshot = resolveNewsSnapshot(currentNode.code, articleTitleFromContent);
    if (!snapshot) return;

    if (lastSynchronizedNodeIdRef.current === currentNode.id) {
      if (activeTab.component !== "news") {
        return;
      }
    }

    if (activeTab.url?.includes("/article/") && snapshot.url?.includes("/recent/")) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      lastSynchronizedNodeIdRef.current = currentNode.id;

      setTabs((prev) => {
        const hasNewsTab = prev.some((tab) => tab.component === "news");
        if (!hasNewsTab) {
          return prev;
        }

        let changed = false;

        const nextTabs = prev.map((tab) => {
          if (tab.id !== activeTab.id) return tab;

          const currentEntry = tab.history[tab.historyIndex];
          const isSameEntry =
            currentEntry &&
            currentEntry.url === snapshot.url &&
            currentEntry.title === snapshot.title &&
            currentEntry.component === "news";

          if (isSameEntry) {
            if (tab.url === snapshot.url && tab.title === snapshot.title && tab.component === "news") {
              return tab;
            }

            changed = true;
            return {
              ...tab,
              url: snapshot.url,
              title: snapshot.title,
              component: "news" as const,
            };
          }

          const truncatedHistory = tab.history.slice(0, tab.historyIndex + 1);
          const nextHistory = [
            ...truncatedHistory,
            {
              url: snapshot.url,
              title: snapshot.title,
              component: "news" as const,
            },
          ];

          changed = true;
          return {
            ...tab,
            url: snapshot.url,
            title: snapshot.title,
            component: "news" as const,
            history: nextHistory,
            historyIndex: nextHistory.length - 1,
          };
        });

        return changed ? nextTabs : prev;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [activeTab, articleTitleFromContent, currentNode]);

  const newsViewMode: "auto" | "list" | "article" =
    activeTab?.url?.includes("/recent/") ? "list" : activeTab?.url?.includes("/article/") ? "article" : "auto";

  const handleFallbackOpenArticle = (card?: { id: string; title: string }) => {
    const fallbackTitle = card?.title || articleTitleFromContent?.trim();
    if (!fallbackTitle) return;

    const fallbackUrl = `https://voidcity-news/article/${encodeURIComponent(fallbackTitle)}`;

    setTabs((prev) => {
      let changed = false;

      const nextTabs = prev.map((tab) => {
        if (tab.id !== activeTabId || tab.component !== "news") return tab;

        const currentEntry = tab.history[tab.historyIndex];
        const isSameEntry =
          currentEntry &&
          currentEntry.url === fallbackUrl &&
          currentEntry.title === fallbackTitle &&
          currentEntry.component === "news";

        if (isSameEntry) {
          if (tab.url === fallbackUrl && tab.title === fallbackTitle) return tab;
          changed = true;
          return {
            ...tab,
            url: fallbackUrl,
            title: fallbackTitle,
            component: "news" as const,
          };
        }

        const truncatedHistory = tab.history.slice(0, tab.historyIndex + 1);
        const nextHistory = [
          ...truncatedHistory,
          {
            url: fallbackUrl,
            title: fallbackTitle,
            component: "news" as const,
          },
        ];

        changed = true;
        return {
          ...tab,
          url: fallbackUrl,
          title: fallbackTitle,
          component: "news" as const,
          history: nextHistory,
          historyIndex: nextHistory.length - 1,
        };
      });

      return changed ? nextTabs : prev;
    });
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    focusWindow(windowId);
    setContextMenu({ x: event.clientX, y: event.clientY });
  };

  return (
    <div
      className="w-full h-full bg-[#0a0514] flex flex-col relative"
      onClick={() => focusWindow(windowId)}
      onContextMenu={handleContextMenu}
    >
      <style>{`
        @keyframes slow-pulse-border {
          0%, 100% {
            opacity: 1;
            border-color: rgba(255, 226, 89, 0.8);
            box-shadow: 0 0 8px rgba(255, 226, 89, 0.6);
          }
          50% {
            opacity: 0.4;
            border-color: rgba(255, 226, 89, 0.15);
            box-shadow: 0 0 0px transparent;
          }
        }
        .pulse-border-hint {
          animation: slow-pulse-border 2.5s ease-in-out infinite;
        }
      `}</style>
      <div className="flex bg-[#110a26] border-b-2 border-[#543ab7] pt-1 px-1 h-8">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`
              flex items-center gap-2 px-3 py-1 text-xs rounded-t border-2 border-b-0 max-w-[150px]
              ${activeTabId === tab.id
                ? "bg-[#0a0514] border-[#543ab7] text-[#0ff] z-10 translate-y-[2px]"
                : "bg-[#1a1130] border-transparent text-[#a48cff] hover:bg-[#241a4a] cursor-pointer"}
            `}
            onClick={() => setActiveTabId(tab.id)}
          >
            <span className="truncate flex-1">{tab.title}</span>
            <button
              className="w-4 h-4 flex items-center justify-center hover:bg-white/10 rounded-full"
              onClick={(event) => {
                event.stopPropagation();
                handleCloseTab(tab.id);
              }}
            >
              x
            </button>
          </div>
        ))}
        <button
          className="w-6 h-6 flex items-center justify-center text-[#a48cff] hover:bg-white/10 rounded ml-1"
          onClick={handleNewTab}
        >
          +
        </button>
      </div>

      <div className="flex bg-[#0f0c29] p-1.5 border-b-2 border-[#543ab7] items-center">
        <button
          type="button"
          className={`mr-2 h-8 min-w-8 rounded border-2 px-2 text-sm ${(canGoBack || (isChapter3Mode && currentView !== "home"))
            ? "border-[#543ab7] text-[#c7b3ff] hover:bg-[#1a1130]"
            : "border-[#2f244f] text-[#5f5a74] cursor-not-allowed"
            }`}
          onClick={() => {
            if (isChapter3Mode && currentView !== "home") {
              if (currentView === "history_list") {
                updateActiveTab({
                  currentView: "home",
                  selectedHint: null,
                  detailOrigin: null,
                  currentSearchQuery: null,
                });
              } else if (currentView === "search_result") {
                if (detailOrigin === "history_list") {
                  updateActiveTab({
                    currentView: "history_list",
                    selectedHint: null,
                    currentSearchQuery: null,
                  });
                } else {
                  updateActiveTab({
                    currentView: "home",
                    selectedHint: null,
                    detailOrigin: null,
                    currentSearchQuery: null,
                  });
                }
              }
            } else {
              handleBack();
            }
          }}
          disabled={!canGoBack && !(isChapter3Mode && currentView !== "home")}
          aria-label="Back"
        >
          {"<"}
        </button>
        <div className="flex-1 min-w-0 bg-[#0a0514] border-2 border-[#543ab7] rounded px-2 py-1 text-[#c7b3ff] text-sm flex items-center shadow-[inset_0_0_10px_rgba(84,58,183,0.3)] mr-2">
          <span className="opacity-50 mr-2">&gt;</span>
          <span
            className="min-w-0 flex-1 truncate whitespace-nowrap"
          >
            {formatAddressBarUrl(activeTab?.url || "about:blank")}
          </span>
        </div>

        {/* 챕터 3 전용: 더 보기(⋮) 버튼 및 드롭다운 */}
        {isChapter3Mode && (
          <div ref={moreMenuRef} className="relative shrink-0 flex items-center z-[1002]">
            <button
              type="button"
              onClick={() => {
                setHasClickedMoreBtn(true);
                setIsMoreMenuOpen((prev) => !prev);
              }}
              className={`w-8 h-8 flex items-center justify-center text-base rounded-sm border-2 transition-all text-[#a48cff] active:text-[#4ce2fc] select-none
                ${!hasClickedMoreBtn ? "pulse-border-hint text-[#ffe259]" : "border-transparent hover:border-[#543ab7] hover:bg-[#1a1130]"}
              `}
              title="더 보기"
            >
              ⋮
            </button>

            {/* 더 보기 드롭다운 메뉴 */}
            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 border-2 border-[#543ab7] rounded-sm bg-[#0d0920]/95 backdrop-blur-md overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.8)]">
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    // 현재 활성화된 탭(activeTabId)의 화면 상태만 'history_list'로 업데이트
                    updateActiveTab({
                      currentView: "history_list",
                      selectedHint: null,
                      currentSearchQuery: null,
                      detailOrigin: null,
                    });
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-[#c7b3ff] hover:bg-[#1a1130] hover:text-[#4ce2fc] transition-colors flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5 opacity-80 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  검색 기록 (History)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden flex flex-row">
        <div className="flex-1 relative z-0 h-full overflow-hidden flex flex-col items-stretch">
          {activeTab?.component === "news" && (
            <NewsTab
              viewMode={newsViewMode}
              activeTabTitle={activeTab?.title}
              onFallbackOpenArticle={(card) => handleFallbackOpenArticle(card)}
            />
          )}
          {activeTab?.component === "home" && (
            <HomeTab
              onNavigate={(url, comp, title) => navigateTab(activeTabId, url, comp, title)}
              isChapter2Mode={isChapter2Mode}
              isChapter3Mode={isChapter3Mode}
              isChapter4Mode={isChapter4Mode}
            />
          )}
          {activeTab?.component === "search" && (
            <SearchTab
              onNavigate={(url, comp, title) => navigateTab(activeTabId, url, comp, title)}
              isChapter3Mode={isChapter3Mode}
              currentView={currentView}
              setCurrentView={(val) => updateActiveTab({ currentView: val })}
              selectedHint={selectedHint}
              setSelectedHint={(val) => updateActiveTab({ selectedHint: val })}
              detailOrigin={detailOrigin}
              setDetailOrigin={(val) => updateActiveTab({ detailOrigin: val })}
              currentSearchQuery={currentSearchQuery}
              setCurrentSearchQuery={(val) => updateActiveTab({ currentSearchQuery: val })}
            />
          )}
          {activeTab?.component === 'pacman' && <PacmanTab windowId={windowId} />}
          {activeTab?.component === 'starforce' && <StarforceTab windowId={windowId} />}
          {activeTab?.component === 'history' && (
            <HistoryTab onNavigate={(url, comp, title) => navigateTab(activeTabId, url, comp, title)} />
          )}
          {activeTab?.component === 'doc' && (
            <DocTab url={activeTab.url} />
          )}
          {(activeTab?.component === 'cardmatching' || activeTab?.component === 'cyberpacketdash') && <CyberPacketDashTab windowId={windowId} />}
          {activeTab?.component === 'lucassurvival' && <LucasSurvivalTab />}
          {activeTab?.component === 'lucasroute' && <LucasRouteTab storyLinked={lucasRouteStoryLinked} windowId={windowId} />}
        </div>

        {showDevTools && (
          <div
            className="h-full flex-shrink-0 animate-in slide-in-from-right-4 relative"
            style={{ width: devToolsWidth }}
          >
            <div
              className="absolute top-0 left-0 w-2 h-full cursor-col-resize z-[1001] hover:bg-white/10 transition-colors"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const startX = event.clientX;
                const startW = devToolsWidth;

                const onMouseMove = (moveEvent: MouseEvent) => {
                  const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;
                  const maxAllowedWidth = containerWidth * 0.7;
                  const newWidth = Math.max(200, Math.min(maxAllowedWidth, startW - (moveEvent.clientX - startX)));
                  setDevToolsWidth(newWidth);
                };

                const onMouseUp = () => {
                  document.removeEventListener("mousemove", onMouseMove);
                  document.removeEventListener("mouseup", onMouseUp);
                };

                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
              }}
            />
            <NetworkDevTools />
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            { label: "New Tab", onClick: handleNewTab },
            { label: showDevTools ? "Close DevTools" : "Open DevTools", onClick: toggleDevTools },
            { label: "Close Tab", onClick: () => handleCloseTab(activeTabId) },
          ]}
        />
      )}
    </div>
  );
};

function resolveNewsSnapshot(nodeCode: string | undefined, articleTitle?: string) {
  if (!nodeCode) return undefined;

  if (nodeCode === "CH1_NEWS_PORTAL") {
    return {
      url: "https://voidcity-news/recent/1",
      title: "News",
    };
  }

  if (nodeCode.includes("ARTICLE")) {
    let title = articleTitle?.trim();
    if (!title) {
      if (nodeCode.includes("DARK_ARTICLE") || nodeCode.includes("SCROLL_CORRUPTION")) {
        title = "넥서스의 어두운 면: 사라진 기록들에 대한 제보";
      } else {
        title = "Article";
      }
    }
    return {
      url: `https://voidcity-news/article/${encodeURIComponent(title)}`,
      title,
    };
  }

  return undefined;
}

function formatAddressBarUrl(url: string) {
  const decoded = safeDecodeUri(url);
  return ellipsizeMiddle(decoded, 90);
}

function safeDecodeUri(url: string) {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
}

function ellipsizeMiddle(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;

  const visible = Math.max(12, maxLength - 3);
  const head = Math.floor(visible * 0.7);
  const tail = Math.max(8, visible - head);

  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}
