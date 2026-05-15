import React, { useState } from "react";
import { Rnd } from "react-rnd";
import { useWindowStore } from "../../../app/store/windowStore";
import { DESKTOP_TASKBAR_HEIGHT } from "../../config/desktopWindows";
import { WindowControlButton } from "../WindowControls";

const WINDOW_CLOSE_ANIMATION_MS = 180;

interface WindowProps {
  id: string;
  title: string;
  icon?: string;
  children: React.ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

function getInitialWindowPosition(defaultWidth: number, defaultHeight: number) {
  if (typeof window === "undefined") {
    return { x: 0, y: 0 };
  }

  const availableHeight = Math.max(0, window.innerHeight - DESKTOP_TASKBAR_HEIGHT);
  const centeredX = Math.max(0, (window.innerWidth - defaultWidth) / 2);
  const centeredY = Math.max(0, (availableHeight - defaultHeight) / 2);

  return {
    x: centeredX + (Math.random() * 40 - 20),
    y: centeredY + (Math.random() * 40 - 20),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toPixelSize(value: string | number, fallback: number) {
  if (typeof value === "number") return value;

  const numericValue = Number.parseFloat(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export const Window: React.FC<WindowProps> = ({
  id,
  title,
  icon,
  children,
  defaultWidth = 800,
  defaultHeight = 600,
  minWidth = 400,
  minHeight = 300,
}) => {
  const windowState = useWindowStore((state) => state.windows.find((window) => window.id === id));
  const { closeWindow, markWindowClosing, minimizeWindow, maximizeWindow, restoreWindow, focusWindow } = useWindowStore();
  const [size, setSize] = useState<{ width: string | number; height: string | number }>({
    width: defaultWidth,
    height: defaultHeight,
  });
  const [position, setPosition] = useState(() => getInitialWindowPosition(defaultWidth, defaultHeight));
  const [isClosing, setIsClosing] = useState(false);

  if (!windowState) {
    return null;
  }

  const isMaximized = windowState.isMaximized;
  const isMinimized = windowState.isMinimized;

  const handleToggleMaximize = () => {
    if (isMaximized) {
      restoreWindow(windowState.id);
      return;
    }

    maximizeWindow(windowState.id);
  };

  const handleClose = () => {
    if (isClosing) return;

    setIsClosing(true);
    markWindowClosing(windowState.id);
    window.setTimeout(() => {
      closeWindow(windowState.id);
    }, WINDOW_CLOSE_ANIMATION_MS);
  };

  const handleHeaderMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isMaximized || event.button !== 0) return;
    if (event.target instanceof HTMLElement && event.target.closest("button")) return;

    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    const headerRect = event.currentTarget.getBoundingClientRect();
    const pointerOffsetY = event.clientY - headerRect.top;
    const pointerRatioX = window.innerWidth > 0 ? event.clientX / window.innerWidth : 0.5;
    const restoredWidth = toPixelSize(size.width, defaultWidth);
    const restoredHeight = toPixelSize(size.height, defaultHeight);
    let hasRestored = false;

    const moveRestoredWindow = (moveEvent: MouseEvent) => {
      const availableHeight = Math.max(0, window.innerHeight - DESKTOP_TASKBAR_HEIGHT);
      const nextX = clamp(
        moveEvent.clientX - restoredWidth * pointerRatioX,
        0,
        Math.max(0, window.innerWidth - restoredWidth)
      );
      const nextY = clamp(
        moveEvent.clientY - pointerOffsetY,
        0,
        Math.max(0, availableHeight - restoredHeight)
      );

      setPosition({ x: nextX, y: nextY });
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!hasRestored) {
        const movedX = moveEvent.clientX - startX;
        const movedY = moveEvent.clientY - startY;
        if (Math.hypot(movedX, movedY) < 4) return;

        hasRestored = true;
        setSize({ width: restoredWidth, height: restoredHeight });
        moveRestoredWindow(moveEvent);
        restoreWindow(windowState.id);
        return;
      }

      moveRestoredWindow(moveEvent);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <Rnd
      size={isMaximized ? { width: "100%", height: "100%" } : size}
      position={isMaximized ? { x: 0, y: 0 } : position}
      onDragStop={(_event, data) => {
        if (!isMaximized) {
          setPosition({ x: data.x, y: data.y });
        }
      }}
      onResizeStop={(_event, _direction, ref, _delta, nextPosition) => {
        if (!isMaximized) {
          setSize({ width: ref.style.width, height: ref.style.height });
          setPosition(nextPosition);
        }
      }}
      minWidth={minWidth}
      minHeight={minHeight}
      onMouseDownCapture={() => focusWindow(windowState.id)}
      disableDragging={isMaximized}
      enableResizing={!isMaximized}
      dragHandleClassName="window-drag-handle"
      bounds="parent"
      style={{
        zIndex: windowState.zIndex,
        pointerEvents: isMinimized || isClosing ? "none" : "auto",
      }}
    >
      <div
        className={`desktop-window-shell w-full h-full flex flex-col bg-[#0f0c29] border-2 border-[#543ab7] rounded shadow-[0_0_15px_rgba(84,58,183,0.7)] overflow-hidden ${
          isMinimized ? "desktop-window-shell--minimized" : ""
        } ${isClosing ? "desktop-window-shell--closing" : ""
        }`}
      >
        <div
          className="window-drag-handle flex cursor-default items-center justify-between px-2 py-1 bg-gradient-to-r from-[#240b36] to-[#0f0c29] border-b-2 border-[#543ab7] select-none"
          onMouseDown={handleHeaderMouseDown}
          onDoubleClick={handleToggleMaximize}
        >
          <div className="flex items-center gap-2">
            {icon && (
              <img
                src={icon}
                alt=""
                className="w-4 h-4 object-contain brightness-150"
                style={{ imageRendering: "pixelated" }}
              />
            )}
            <span className="text-[#a48cff] font-window-title text-sm tracking-wider drop-shadow-[0_0_3px_rgba(164,140,255,0.8)]">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <WindowControlButton
              variant="minimize"
              label="Minimize"
              className="border-transparent text-[#0ff] hover:border-[#0ff] hover:bg-[#0ff]/20"
              onClick={(event) => {
                event.stopPropagation();
                minimizeWindow(windowState.id);
              }}
            />

            <WindowControlButton
              variant={isMaximized ? "restore" : "maximize"}
              label={isMaximized ? "Restore" : "Maximize"}
              className="border-transparent text-[#0ff] hover:border-[#0ff] hover:bg-[#0ff]/20"
              onClick={(event) => {
                event.stopPropagation();
                handleToggleMaximize();
              }}
            />

            <WindowControlButton
              variant="close"
              label="Close"
              className="border-transparent text-[#ff3366] hover:border-[#ff3366] hover:bg-[#ff3366]/20"
              onClick={(event) => {
                event.stopPropagation();
                handleClose();
              }}
            />
          </div>
        </div>

        <div className="flex-1 w-full h-full relative bg-[#0a0514] overflow-hidden">{children}</div>
      </div>
    </Rnd>
  );
};
