import React, { useEffect, useRef } from "react";
import { WindowControlButton } from "../WindowControls";
import { DESKTOP_TASKBAR_HEIGHT } from "../../config/desktopWindows";

interface WindowFrameProps {
  title: string;
  children: React.ReactNode;
  zIndex: number;
  onClose?: () => void;
  onMinimize?: () => void;
  onFocus?: () => void;
  onToggleMaximize?: () => void;
  isMinimized?: boolean;
  isMaximized?: boolean;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { w: number; h: number };
  minSize?: { w: number; h: number };
  allowMinimize?: boolean;
  allowMaximize?: boolean;
  allowResize?: boolean;
  theme?: "green" | "magenta" | "cyan";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export const WindowFrame: React.FC<WindowFrameProps> = ({
  title,
  children,
  zIndex,
  onClose,
  onMinimize,
  onFocus,
  onToggleMaximize,
  isMinimized = false,
  isMaximized = false,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { w: 600, h: 400 },
  minSize = { w: 300, h: 200 },
  allowMinimize = true,
  allowMaximize = true,
  allowResize = true,
  theme = "green",
}) => {
  const windowRef = useRef<HTMLDivElement>(null);
  const geom = useRef({
    x: defaultPosition.x,
    y: defaultPosition.y,
    w: defaultSize.w,
    h: defaultSize.h,
    isDragging: false,
    isResizing: false,
    startX: 0,
    startY: 0,
    startW: 0,
    startH: 0,
    startLeft: 0,
    startTop: 0,
    resizeDir: "",
  });

  useEffect(() => {
    if (windowRef.current && !isMaximized) {
      windowRef.current.style.transform = `translate(${geom.current.x}px, ${geom.current.y}px)`;
      windowRef.current.style.width = `${geom.current.w}px`;
      windowRef.current.style.height = `${geom.current.h}px`;
    }
  }, [isMaximized]);

  const handleHeaderMouseDown = (event: React.MouseEvent) => {
    onFocus?.();

    if (isMaximized) {
      if (!onToggleMaximize || event.button !== 0) return;
      if (event.target instanceof HTMLElement && event.target.closest("button")) return;

      event.preventDefault();

      const startX = event.clientX;
      const startY = event.clientY;
      const headerRect = event.currentTarget.getBoundingClientRect();
      const pointerOffsetY = event.clientY - headerRect.top;
      const pointerRatioX = window.innerWidth > 0 ? event.clientX / window.innerWidth : 0.5;
      let hasRestored = false;

      const moveRestoredWindow = (moveEvent: MouseEvent) => {
        const availableHeight = Math.max(0, window.innerHeight - DESKTOP_TASKBAR_HEIGHT);
        geom.current.x = clamp(
          moveEvent.clientX - geom.current.w * pointerRatioX,
          0,
          Math.max(0, window.innerWidth - geom.current.w)
        );
        geom.current.y = clamp(
          moveEvent.clientY - pointerOffsetY,
          0,
          Math.max(0, availableHeight - geom.current.h)
        );

        if (windowRef.current) {
          windowRef.current.style.transform = `translate(${geom.current.x}px, ${geom.current.y}px)`;
          windowRef.current.style.width = `${geom.current.w}px`;
          windowRef.current.style.height = `${geom.current.h}px`;
        }
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!hasRestored) {
          const movedX = moveEvent.clientX - startX;
          const movedY = moveEvent.clientY - startY;
          if (Math.hypot(movedX, movedY) < 4) return;

          hasRestored = true;
          geom.current.isDragging = true;
          if (windowRef.current) windowRef.current.style.transition = "none";
          moveRestoredWindow(moveEvent);
          onToggleMaximize();
          return;
        }

        moveRestoredWindow(moveEvent);
      };

      const handleMouseUp = () => {
        geom.current.isDragging = false;
        if (windowRef.current) windowRef.current.style.transition = "";
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return;
    }

    geom.current.isDragging = true;
    geom.current.startX = event.clientX;
    geom.current.startY = event.clientY;
    geom.current.startLeft = geom.current.x;
    geom.current.startTop = geom.current.y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!geom.current.isDragging) return;

      const dx = moveEvent.clientX - geom.current.startX;
      const dy = moveEvent.clientY - geom.current.startY;
      
      const nextX = geom.current.startLeft + dx;
      const nextY = geom.current.startTop + dy;

      const availableWidth = window.innerWidth;
      const availableHeight = window.innerHeight - DESKTOP_TASKBAR_HEIGHT;

      geom.current.x = clamp(nextX, 0, Math.max(0, availableWidth - geom.current.w));
      geom.current.y = clamp(nextY, 0, Math.max(0, availableHeight - geom.current.h));

      if (windowRef.current) {
        windowRef.current.style.transform = `translate(${geom.current.x}px, ${geom.current.y}px)`;
      }
    };

    const onMouseUp = () => {
      geom.current.isDragging = false;
      if (windowRef.current) windowRef.current.style.transition = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    if (windowRef.current) windowRef.current.style.transition = "none";
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleResizeMouseDown = (event: React.MouseEvent, direction: string) => {
    if (isMaximized) return;

    event.stopPropagation();
    onFocus?.();
    geom.current.isResizing = true;
    geom.current.resizeDir = direction;
    geom.current.startX = event.clientX;
    geom.current.startY = event.clientY;
    geom.current.startW = geom.current.w;
    geom.current.startH = geom.current.h;
    geom.current.startLeft = geom.current.x;
    geom.current.startTop = geom.current.y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!geom.current.isResizing) return;

      const dx = moveEvent.clientX - geom.current.startX;
      const dy = moveEvent.clientY - geom.current.startY;
      let newW = geom.current.startW;
      let newH = geom.current.startH;
      let newX = geom.current.startLeft;
      let newY = geom.current.startTop;

      if (geom.current.resizeDir.includes("e")) newW += dx;
      if (geom.current.resizeDir.includes("s")) newH += dy;
      if (geom.current.resizeDir.includes("w")) {
        newW -= dx;
        newX += dx;
      }
      if (geom.current.resizeDir.includes("n")) {
        newH -= dy;
        newY += dy;
      }

      if (newW < minSize.w) {
        if (geom.current.resizeDir.includes("w")) newX -= minSize.w - newW;
        newW = minSize.w;
      }
      if (newH < minSize.h) {
        if (geom.current.resizeDir.includes("n")) newY -= minSize.h - newH;
        newH = minSize.h;
      }

      geom.current.w = newW;
      geom.current.h = newH;
      geom.current.x = newX;
      geom.current.y = newY;

      if (windowRef.current) {
        windowRef.current.style.width = `${newW}px`;
        windowRef.current.style.height = `${newH}px`;
        windowRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
      }
    };

    const onMouseUp = () => {
      geom.current.isResizing = false;
      if (windowRef.current) windowRef.current.style.transition = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    if (windowRef.current) windowRef.current.style.transition = "none";
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const themeClasses = theme === "cyan"
    ? "border-[#00D4FF] shadow-[0_0_20px_rgba(0,212,255,0.25)]"
    : theme === "magenta"
    ? "border-[#FF00FF] shadow-[0_0_20px_rgba(255,0,255,0.15)]"
    : "border-green-800 shadow-[0_0_20px_rgba(0,255,0,0.15)]";

  const headerClasses = theme === "cyan"
    ? "border-b-2 border-[#0099CC] bg-gray-900"
    : theme === "magenta"
    ? "border-b-2 border-[#BC00BC] bg-gray-900"
    : "border-b-2 border-green-900 bg-gray-900";
  const titleClasses = theme === "cyan"
    ? "text-[#00D4FF] drop-shadow-[0_0_5px_rgba(0,212,255,0.6)]"
    : theme === "magenta"
    ? "text-[#FF00FF] drop-shadow-[0_0_5px_rgba(255,0,255,0.5)]"
    : "text-green-500";
  const iconClasses = theme === "cyan"
    ? "bg-[#00D4FF]"
    : theme === "magenta"
    ? "bg-[#FF00FF]"
    : "bg-green-500";
  const buttonClasses = theme === "cyan"
    ? "text-[#00D4FF] hover:bg-[#00D4FF]/10 hover:text-[#00D4FF] hover:border-[#00D4FF]/50"
    : theme === "magenta"
    ? "text-[#FF00FF] hover:bg-[#2A002A] hover:text-[#FF00FF] hover:border-[#FF00FF]/50"
    : "text-green-600 hover:bg-green-900/60 hover:text-green-300 hover:border-green-500/50";

  const baseClasses =
    `absolute flex flex-col overflow-hidden bg-black border-2 ${themeClasses} ring-1 ring-black origin-bottom`;
  const stateClasses = isMinimized
    ? "opacity-0 scale-50 pointer-events-none transition-all duration-300 ease-in-out"
    : isMaximized
      ? "!inset-0 !w-full !h-full !transform-none rounded-none border-0"
      : "opacity-100 scale-100 rounded-sm";

  return (
    <div
      ref={windowRef}
      className={`${baseClasses} ${stateClasses}`}
      style={{ zIndex }}
      onMouseDownCapture={onFocus}
    >
      <div
        className={`flex h-8 cursor-default items-center justify-between select-none px-1 ${headerClasses}`}
        onMouseDown={handleHeaderMouseDown}
        onDoubleClick={allowMaximize ? onToggleMaximize : undefined}
      >
        <div className={`flex items-center space-x-2 px-2 font-window-title text-sm tracking-wide font-bold ${titleClasses}`}>
          <div className={`w-3 h-3 rounded-sm opacity-80 ${iconClasses}`} />
          <span>{title}</span>
        </div>

        <div className="flex items-center h-full gap-1 mr-1">
          {allowMinimize && onMinimize && (
            <WindowControlButton
              variant="minimize"
              label="Minimize"
              className={`mx-[1px] border-transparent bg-transparent ${buttonClasses}`}
              onClick={(event) => {
                event.stopPropagation();
                onMinimize();
              }}
            />
          )}
          {allowMaximize && onToggleMaximize && (
            <WindowControlButton
              variant={isMaximized ? "restore" : "maximize"}
              label={isMaximized ? "Restore" : "Maximize"}
              className={`mx-[1px] border-transparent bg-transparent ${buttonClasses}`}
              onClick={(event) => {
                event.stopPropagation();
                onToggleMaximize();
              }}
            />
          )}
          {onClose && (
            <WindowControlButton
              variant="close"
              label="Close"
              className={`mx-[1px] border-transparent bg-transparent hover:border-red-500/50 hover:bg-red-800/70 hover:text-white ${theme === "cyan" ? "text-[#00D4FF]" : theme === "magenta" ? "text-[#FF00FF]" : "text-green-600"}`}
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
            />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden pointer-events-auto bg-black relative">{children}</div>

      {allowResize && !isMaximized && !isMinimized && (
        <>
          <div className="absolute top-0 left-0 w-2 h-2 cursor-nwse-resize z-50" onMouseDown={(event) => handleResizeMouseDown(event, "nw")} />
          <div className="absolute top-0 right-0 w-2 h-2 cursor-nesw-resize z-50" onMouseDown={(event) => handleResizeMouseDown(event, "ne")} />
          <div className="absolute bottom-0 left-0 w-2 h-2 cursor-nesw-resize z-50" onMouseDown={(event) => handleResizeMouseDown(event, "sw")} />
          <div className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-50" onMouseDown={(event) => handleResizeMouseDown(event, "se")} />
          <div className="absolute top-0 left-2 right-2 h-1 cursor-ns-resize z-40" onMouseDown={(event) => handleResizeMouseDown(event, "n")} />
          <div className="absolute bottom-0 left-2 right-2 h-2 cursor-ns-resize z-40" onMouseDown={(event) => handleResizeMouseDown(event, "s")} />
          <div className="absolute top-2 bottom-2 left-0 w-1 cursor-ew-resize z-40" onMouseDown={(event) => handleResizeMouseDown(event, "w")} />
          <div className="absolute top-2 bottom-2 right-0 w-2 cursor-ew-resize z-40" onMouseDown={(event) => handleResizeMouseDown(event, "e")} />
        </>
      )}
    </div>
  );
};
