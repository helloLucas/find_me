import React, { useEffect, useRef, useState } from "react";
import { useWindowStore } from "../../app/store/windowStore";
import { useBrowserContentStore } from "../../app/store/browserContentStore";
import { NewsTab } from "./components/NewsTab";
import { HomeTab } from "./components/HomeTab";
import { PacmanTab } from "./components/PacmanTab";
import { HistoryTab } from "./components/HistoryTab";
import { DocTab } from "./components/DocTab";
import { NetworkDevTools } from "./components/NetworkDevTools";
import { ContextMenu } from "../../shared/ui/ContextMenu";
import { useStoryRuntimeStore } from "../story-runtime/storyRuntime.store";
import type { DesktopWindowId } from "../../shared/config/desktopWindows";
import {
  canSubmitStoryAction,
  getStoryInspectTarget,
} from "../story-runtime/storyActionGuards";

interface Tab {
  id: string;
  title: string;
  url: string;
  component: "news" | "home" | "pacman" | "history" | "doc";
  history: Array<{
    url: string;
    component: "news" | "home" | "pacman" | "history" | "doc";
    title: string;
  }>;
  historyIndex: number;
}

interface BrowserProps {
  windowId: DesktopWindowId;
}

export const Browser: React.FC<BrowserProps> = ({ windowId }) => {
  const { closeWindow, focusWindow } = useWindowStore();
  const { currentNode, submitStoryInspect } = useStoryRuntimeStore();
  const { content: browserContent, isChapter2Mode, setIsChapter2Mode } = useBrowserContentStore();

  // 챕터 2 여부 감지 (최초 진입 시 1회만 설정)
  useEffect(() => {
    if (currentNode?.code?.startsWith("CH2_") && !isChapter2Mode) {
      setIsChapter2Mode(true);
    }
  }, [currentNode, isChapter2Mode, setIsChapter2Mode]);

  const [tabs, setTabs] = useState<Tab[]>(() => {
    // 챕터 2일 경우 히스토리 탭을 기본으로 노출
    if (currentNode?.code?.startsWith("CH2_")) {
      return [{
        id: "tab1",
        title: "History",
        url: "system://history",
        component: "history",
        history: [{ url: "system://history", component: "history", title: "History" }],
        historyIndex: 0,
      }];
    }
    
    // 기본값 (챕터 1 등)
    return [{
      id: "tab1",
      title: "Home",
      url: "https://voidcity-news/recent/1",
      component: "news",
      history: [{ url: "https://voidcity-news/recent/1", component: "news", title: "Home" }],
      historyIndex: 0,
    }];
  });
  const [activeTabId, setActiveTabId] = useState("tab1");
  const [showDevTools, setShowDevTools] = useState(false);
  const [devToolsWidth, setDevToolsWidth] = useState(320);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastAutoInspectNodeIdRef = useRef<number | null>(null);
  const skipAutoSyncNodeIdByTabRef = useRef<Record<string, number>>({});

  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const articleTitleFromContent =
    typeof browserContent.articleTitle === "string" ? browserContent.articleTitle : undefined;

  const handleNewTab = () => {
    const newId = `tab_${Date.now()}`;
    setTabs((prev) => [
      ...prev,
      {
        id: newId,
        title: "New Tab",
        url: "",
        component: "home",
        history: [
          {
            url: "",
            component: "home",
            title: "New Tab",
          },
        ],
        historyIndex: 0,
      },
    ]);
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
    if ("keyboard" in navigator && (navigator as any).keyboard?.lock) {
      (navigator as any).keyboard.lock(["ControlLeft", "KeyW", "ControlRight", "KeyW"]).catch(() => {});
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

    setTabs((prev) => {
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
  }, [activeTab, articleTitleFromContent, currentNode]);

  const newsViewMode: "auto" | "list" | "article" =
    activeTab?.url?.includes("/recent/") ? "list" : activeTab?.url?.includes("/article/") ? "article" : "auto";

  const handleFallbackOpenArticle = () => {
    const fallbackTitle = articleTitleFromContent?.trim();
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
      ref={containerRef}
      className="flex flex-col w-full h-full bg-[#0a0514] font-browser-chrome outline-none"
      tabIndex={-1}
      onContextMenu={handleContextMenu}
      onClick={() => focusWindow(windowId)}
    >
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

      <div className="flex bg-[#0f0c29] p-1.5 border-b-2 border-[#543ab7]">
        <button
          type="button"
          className={`mr-2 h-8 min-w-8 rounded border-2 px-2 text-sm ${
            canGoBack
              ? "border-[#543ab7] text-[#c7b3ff] hover:bg-[#1a1130]"
              : "border-[#2f244f] text-[#5f5a74] cursor-not-allowed"
          }`}
          onClick={handleBack}
          disabled={!canGoBack}
          aria-label="Back"
        >
          {"<"}
        </button>
        <div className="flex-1 min-w-0 bg-[#0a0514] border-2 border-[#543ab7] rounded px-2 py-1 text-[#c7b3ff] text-sm flex items-center shadow-[inset_0_0_10px_rgba(84,58,183,0.3)]">
          <span className="opacity-50 mr-2">&gt;</span>
          <span
            className="min-w-0 flex-1 truncate whitespace-nowrap"
          >
            {formatAddressBarUrl(activeTab?.url || "about:blank")}
          </span>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex flex-row">
        <div className="flex-1 relative z-0 h-full overflow-hidden">
          {activeTab?.component === "news" && (
            <NewsTab
              viewMode={newsViewMode}
              onFallbackOpenArticle={() => handleFallbackOpenArticle()}
            />
          )}
          {activeTab?.component === "home" && (
            <HomeTab 
              onNavigate={(url, comp, title) => navigateTab(activeTabId, url, comp, title)} 
              isChapter2Mode={isChapter2Mode}
            />
          )}
          {activeTab?.component === 'pacman' && <PacmanTab windowId={windowId} />}
          {activeTab?.component === 'history' && (
            <HistoryTab onNavigate={(url, comp, title) => navigateTab(activeTabId, url, comp, title)} />
          )}
          {activeTab?.component === 'doc' && (
            <DocTab url={activeTab.url} />
          )}
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
      title: "Home",
    };
  }

  if (nodeCode.includes("ARTICLE")) {
    const title = articleTitle?.trim() || "Article";
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
