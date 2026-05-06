import React, { useMemo, useState } from "react";
import { DesktopIcon } from "../../shared/ui/DesktopIcon";
import { Taskbar } from "../Taskbar";
import { TerminalScene } from "../../features/command-input/TerminalScene";
import { useWindowStore } from "../../app/store/windowStore";
import { env } from "../../shared/config/env";
import { Window } from "../../shared/ui/Window";
import { Browser } from "../../features/Browser";
import { MessengerNotificationCard, MessengerWindow } from "../../features/messenger";
import { Lucas } from "../../features/Lucas/Lucas";
import { DocumentViewer } from "../../features/DocumentViewer/DocumentViewer";
import { CallOverlay } from "../../features/story-runtime/ui/CallOverlay";
import { useStoryRuntimeStore } from "../../features/story-runtime/storyRuntime.store";
import { canSubmitStoryAction } from "../../features/story-runtime/storyActionGuards";
import {
  DESKTOP_TASKBAR_HEIGHT,
  DESKTOP_WINDOW_DEFINITIONS,
} from "../../shared/config/desktopWindows";
import { BugReportModal } from "../BugReportModal";
import { trackAnalyticsEvent } from "../../shared/analytics";
import { useTrackVisible } from "../../shared/analytics/useTrackVisible";

export const Desktop: React.FC = () => {
  const { windows, openWindow, blurAllWindows } = useWindowStore();
  const { currentNode, submitStoryClick } = useStoryRuntimeStore();
  const desktopViewRef = useTrackVisible<HTMLDivElement>({
    eventName: "desktop_visible_10s",
    params: { page: "play" },
    minVisibleMs: 10000,
  });
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const [rainDrops] = useState(() =>
    Array.from({ length: 50 }).map((_, index) => ({
      id: index,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${0.5 + Math.random() * 0.5}s`,
      opacity: 0.1 + Math.random() * 0.3,
    }))
  );

  const orderedWindows = useMemo(
    () => [...windows].sort((left, right) => left.zIndex - right.zIndex),
    [windows]
  );

  const icons = [
    { id: "terminal", label: "Terminal", icon: DESKTOP_WINDOW_DEFINITIONS.terminal.iconPath },
    { id: "chrome", label: "Browser", icon: DESKTOP_WINDOW_DEFINITIONS.chrome.iconPath },
    { id: "notepad", label: "Notebook", icon: "/pixel_notepad_icon.svg" },
    { id: "trash", label: "Recycle Bin", icon: "/pixel_trash_icon.svg" },
    { id: "email", label: "Bug Report", icon: "/pixel_email_cyberpunk.png" },
  ];

  const handleIconDoubleClick = (id: string) => {
    trackAnalyticsEvent("desktop_icon_opened", {
      icon_id: id,
    });

    if (id === "terminal") {
      openWindow("terminal");
      if (canSubmitStoryAction(currentNode, "click", "open_terminal")) {
        void submitStoryClick("open_terminal");
      }
      return;
    }

    if (id === "chrome") {
      openWindow("chrome");
      return;
    }

    if (id === "email") {
      openWindow("email");
      return;
    }

    console.log(`Opening ${id}`);
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.target !== event.currentTarget) return;

    blurAllWindows();
    setSelectionBox({
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
    });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!selectionBox) return;

    setSelectionBox({
      ...selectionBox,
      currentX: event.clientX,
      currentY: event.clientY,
    });
  };

  const handleMouseUp = () => {
    if (selectionBox) {
      setSelectionBox(null);
    }
  };

  return (
    <div
      ref={desktopViewRef}
      className="relative h-screen w-screen overflow-hidden bg-cover bg-center select-none font-desktop-ui"
      style={{ backgroundImage: 'url("/display_background.png")' }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="rain-container">
        {rainDrops.map((drop) => (
          <div
            key={drop.id}
            className="rain-drop"
            style={{
              left: drop.left,
              animationDelay: drop.delay,
              animationDuration: drop.duration,
              opacity: drop.opacity,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-indigo-900/10 pointer-events-none mix-blend-overlay" />

      <div
        className="absolute inset-0"
        style={{ bottom: DESKTOP_TASKBAR_HEIGHT }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {selectionBox && (
          <div
            className="absolute border border-[#0ff] bg-[#0ff]/20 pointer-events-none z-0"
            style={{
              left: Math.min(selectionBox.startX, selectionBox.currentX),
              top: Math.min(selectionBox.startY, selectionBox.currentY),
              width: Math.abs(selectionBox.currentX - selectionBox.startX),
              height: Math.abs(selectionBox.currentY - selectionBox.startY),
            }}
          />
        )}

        <div className="absolute left-4 top-4 flex flex-col gap-2 z-10 w-24">
          {icons.map((icon) => (
            <DesktopIcon
              key={icon.id}
              label={icon.label}
              iconPath={icon.icon}
              onDoubleClick={() => handleIconDoubleClick(icon.id)}
            />
          ))}
        </div>

        {orderedWindows.map((windowState) => {
          if (windowState.type === "browser") {
            return (
              <Window
                key={windowState.id}
                id={windowState.id}
                title={windowState.title}
                icon={DESKTOP_WINDOW_DEFINITIONS[windowState.id].iconPath}
                defaultWidth={1000}
              >
                <Browser windowId={windowState.id} />
              </Window>
            );
          }

          if (windowState.type === "terminal") {
            return <TerminalScene key={windowState.id} windowId={windowState.id} />;
          }

          if (windowState.type === "document_viewer") {
            const documentSrc = windowState.content
              ? `${env.cdnUrl}/images/${windowState.content}`
              : "";

            return (
              <Window
                key={windowState.id}
                id={windowState.id}
                title={windowState.title}
                icon={DESKTOP_WINDOW_DEFINITIONS[windowState.id].iconPath}
                defaultWidth={600}
                defaultHeight={800}
              >
                <DocumentViewer src={documentSrc} title={windowState.title} />
              </Window>
            );
          }

          if (windowState.type === "email") {
            return (
              <BugReportModal
                key={windowState.id}
                isOpen={true}
                onClose={() => useWindowStore.getState().closeWindow("email")}
                zIndex={windowState.zIndex}
                onFocus={() => useWindowStore.getState().focusWindow("email")}
              />
            );
          }

          return <MessengerWindow key={windowState.id} windowId={windowState.id} />;
        })}

        <MessengerNotificationCard />
        <CallOverlay />
        <Lucas />
      </div>

      <Taskbar />
    </div>
  );
};
