import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "../../shared/ui/Clock";
import { useClientStore } from "../../app/store/clientStore";
import { useWindowStore } from "../../app/store/windowStore";
import { useMessengerStore } from "../../app/store/messengerStore";
import { useLucasStore } from "../../app/store/lucasStore";
import { useBrowserContentStore } from "../../app/store/browserContentStore";
import { useStoryRuntimeStore } from "../../features/story-runtime/storyRuntime.store";
import { canSubmitStoryAction } from "../../features/story-runtime/storyActionGuards";
import { ExitGameOverlay } from "../../shared/ui/ExitGameOverlay/ExitGameOverlay";
import { VolumeControl } from "./VolumeControl";
import { DESKTOP_LAYER, DESKTOP_WINDOW_DEFINITIONS } from "../../shared/config/desktopWindows";
import { useNotepadStore } from "../../app/store/notepadStore";
import { trackAnalyticsEvent } from "../../shared/analytics";

export const Taskbar: React.FC = () => {
  const navigate = useNavigate();
  const { terminalUser, terminalHost, terminalPath } = useClientStore();
  const { windows, focusWindow, minimizeWindow, activeWindowId, openWindow } = useWindowStore();
  const { conversations } = useMessengerStore();
  const { currentNode, submitStoryClick, isLoading } = useStoryRuntimeStore();
  const hasConversations = Object.keys(conversations).length > 0;
  const [showExitOverlay, setShowExitOverlay] = useState(false);

  const terminalWindow = windows.find((windowState) => windowState.id === "terminal");
  const messengerWindow = windows.find((windowState) => windowState.id === "messenger");
  const browserWindows = windows.filter((windowState) => windowState.type === "browser");
  const notepadWindows = windows.filter((windowState) => windowState.type === "notepad");
  const pendingOpenChatAction = Object.values(conversations)
    .flatMap((conversation) => conversation.actions ?? [])
    .find((action) => action.actionType === "open_friend_chat");

  const consumePendingOpenChatAction = () => {
    if (!pendingOpenChatAction) return;
    if (!canSubmitStoryAction(currentNode, "click", pendingOpenChatAction.actionType)) return;
    void submitStoryClick(pendingOpenChatAction.actionType);
  };

  const handleExitConfirm = () => {
    trackAnalyticsEvent("game_exit_confirmed", {
      chapter_code: currentNode?.code ?? "unknown",
    });
    setShowExitOverlay(false);

    // 게임 관련 전역 상태 모두 초기화 (처음부터 다시 시작하기 위해)
    useClientStore.getState().resetClientStore();
    useStoryRuntimeStore.getState().resetStoryRuntime();
    useMessengerStore.getState().resetMessenger();
    useLucasStore.getState().resetLucas();
    useBrowserContentStore.getState().resetContent();
    useWindowStore.getState().resetWindows();
    useNotepadStore.getState().resetNotepad();

    navigate("/lobby", { replace: true });
  };

  const handleTerminalTaskbarClick = () => {
    trackAnalyticsEvent("taskbar_terminal_clicked");

    const canOpenTerminalTransition =
      !isLoading && canSubmitStoryAction(currentNode, "click", "open_terminal");

    if (canOpenTerminalTransition) {
      void submitStoryClick("open_terminal");

      if (!terminalWindow) {
        openWindow("terminal");
        return;
      }

      if (terminalWindow.isMinimized || activeWindowId !== terminalWindow.id) {
        focusWindow(terminalWindow.id);
      }
      return;
    }

    if (!terminalWindow) {
      openWindow("terminal");
      return;
    }

    const isActive = !terminalWindow.isMinimized && activeWindowId === terminalWindow.id;
    if (terminalWindow.isMinimized || !isActive) {
      focusWindow(terminalWindow.id);
      return;
    }

    minimizeWindow(terminalWindow.id);
  };

  const handleMessengerTaskbarClick = () => {
    trackAnalyticsEvent("taskbar_messenger_clicked", {
      has_conversations: hasConversations,
    });
    if (!hasConversations) return;

    if (!messengerWindow) {
      openWindow("messenger");
      consumePendingOpenChatAction();
      return;
    }

    const isActive = !messengerWindow.isMinimized && activeWindowId === messengerWindow.id;
    if (messengerWindow.isMinimized || !isActive) {
      focusWindow(messengerWindow.id);
      consumePendingOpenChatAction();
      return;
    }

    minimizeWindow(messengerWindow.id);
  };

  const handleBrowserTaskbarClick = () => {
    trackAnalyticsEvent("taskbar_browser_clicked");

    // CH1_FRIEND_CHAT_OPEN 구간에서는 브라우저 직접 오픈도 기사 보기 전이로 인정한다.
    if (
      !isLoading &&
      canSubmitStoryAction(currentNode, "click", "friend_message_link")
    ) {
      void submitStoryClick("friend_message_link");
      return;
    }

    openWindow("chrome");
  };

  return (
    <>
      <footer
        className="fixed bottom-0 left-0 right-0 h-10 w-full border-t border-white/10 bg-black/40 backdrop-blur-md px-1 flex items-center justify-between font-desktop-ui"
        style={{ zIndex: DESKTOP_LAYER.taskbar }}
      >
        <div className="flex h-full items-center gap-1">
          <button
            className="flex h-8 w-8 items-center justify-center rounded transition-all hover:bg-red-900/40 active:bg-red-900/60 hover:shadow-[0_0_10px_rgba(239,68,68,0.2)]"
            onClick={() => {
              trackAnalyticsEvent("game_exit_prompt_opened");
              setShowExitOverlay(true);
            }}
          >
            <img
              src="/pixel_power_icon.svg"
              alt="Exit"
              className="h-5 w-5 object-contain opacity-60 hover:opacity-100"
              style={{ imageRendering: "pixelated" }}
            />
          </button>

          <div className="h-6 w-px bg-white/10 mx-1" />

          <button
            className={`flex h-8 w-8 items-center justify-center rounded transition-all hover:bg-white/20 active:bg-white/30 hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] ${hasConversations ? "" : "opacity-50 pointer-events-none"}`}
            onClick={handleMessengerTaskbarClick}
          >
            <img src="/pixel_messanger_icon.svg" alt="Messenger" className="h-6 w-6 object-contain" style={{ imageRendering: "pixelated" }} />
          </button>

          <button
            className="flex h-8 w-8 items-center justify-center rounded transition-all hover:bg-white/20 active:bg-white/30 hover:shadow-[0_0_10px_rgba(34,211,238,0.2)]"
            onClick={handleBrowserTaskbarClick}
          >
            <img src="/pixel_chrome_icon.svg" alt="Chrome" className="h-5 w-5 object-contain" style={{ imageRendering: "pixelated" }} />
          </button>

          <div className="h-6 w-px bg-white/10 mx-1" />

          <div className="flex items-center gap-1">
            {terminalWindow && (
              <button
                onClick={handleTerminalTaskbarClick}
                className={`flex h-8 px-3 items-center justify-start min-w-[150px] max-w-[200px] rounded truncate text-green-400 text-xs transition-all font-desktop-ui ${
                  terminalWindow.isMinimized
                    ? "bg-white/10 hover:bg-white/20 active:bg-white/30"
                    : "bg-white/20 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]"
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-green-400 mr-2 opacity-80 shrink-0" />
                <span className="truncate">{terminalUser}@{terminalHost}:{terminalPath}$</span>
              </button>
            )}

            {browserWindows.map((windowState) => {
              const isActive = !windowState.isMinimized && activeWindowId === windowState.id;

              return (
                <button
                  key={windowState.id}
                  onClick={() =>
                    windowState.isMinimized || !isActive
                      ? focusWindow(windowState.id)
                      : minimizeWindow(windowState.id)
                  }
                  className={`flex items-center px-2 py-1 h-8 max-w-[150px] rounded border ${
                    isActive
                      ? "bg-white/20 border-white/30 shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]"
                      : "bg-transparent border-transparent hover:bg-white/10"
                  } transition-all`}
                >
                  <img
                    src={DESKTOP_WINDOW_DEFINITIONS[windowState.id].iconPath}
                    className="w-4 h-4 mr-2 object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <span className="text-white text-xs truncate leading-none">{windowState.title}</span>
                </button>
              );
            })}

            {notepadWindows.map((windowState) => {
              const isActive = !windowState.isMinimized && activeWindowId === windowState.id;

              return (
                <button
                  key={windowState.id}
                  onClick={() =>
                    windowState.isMinimized || !isActive
                      ? focusWindow(windowState.id)
                      : minimizeWindow(windowState.id)
                  }
                  className={`flex items-center px-2 py-1 h-8 max-w-[150px] rounded border ${
                    isActive
                      ? "bg-white/20 border-white/30 shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]"
                      : "bg-transparent border-transparent hover:bg-white/10"
                  } transition-all`}
                >
                  <img
                    src="/pixel_notepad_icon.svg"
                    className="w-4 h-4 mr-2 object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <span className="text-white text-xs truncate leading-none">{windowState.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mr-2 flex items-center gap-3">
          <div className="flex items-center gap-2 px-2">
            <VolumeControl />
            <img src="/pixel_wifi.svg" alt="WiFi" className="h-4 w-4 object-contain brightness-90" style={{ imageRendering: "pixelated" }} />
            <img src="/pixel_signal.svg" alt="Signal" className="h-4 w-4 object-contain brightness-90" style={{ imageRendering: "pixelated" }} />
          </div>

          <Clock />
        </div>
      </footer>

      {showExitOverlay && (
        <ExitGameOverlay
          onConfirm={handleExitConfirm}
          onCancel={() => {
            trackAnalyticsEvent("game_exit_cancelled");
            setShowExitOverlay(false);
          }}
          subMessage="종료 후 처음부터 다시 시작해야 합니다"
        />
      )}
    </>
  );
};
