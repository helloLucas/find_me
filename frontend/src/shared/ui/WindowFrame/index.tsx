import React, { useEffect, useRef } from "react";

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
    if (isMaximized) return;

    geom.current.isDragging = true;
    geom.current.startX = event.clientX;
    geom.current.startY = event.clientY;
    geom.current.startLeft = geom.current.x;
    geom.current.startTop = geom.current.y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!geom.current.isDragging) return;

      const dx = moveEvent.clientX - geom.current.startX;
      const dy = moveEvent.clientY - geom.current.startY;
      geom.current.x = geom.current.startLeft + dx;
      geom.current.y = geom.current.startTop + dy;

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
        className={`flex items-center justify-between select-none cursor-move h-8 px-1 ${headerClasses}`}
        onMouseDown={handleHeaderMouseDown}
        onDoubleClick={allowMaximize ? onToggleMaximize : undefined}
      >
        <div className={`flex items-center space-x-2 px-2 font-mono text-sm tracking-wide font-bold ${titleClasses}`}>
          <div className={`w-3 h-3 rounded-sm opacity-80 ${iconClasses}`} />
          <span>{title}</span>
        </div>

        <div className="flex items-center h-full gap-1 mr-1">
          {allowMinimize && onMinimize && (
            <button
              className={`w-7 h-6 flex items-center justify-center bg-transparent border border-transparent mx-[1px] transition-colors ${buttonClasses}`}
              onClick={(event) => {
                event.stopPropagation();
                onMinimize();
              }}
            >
              <span className="w-[10px] h-[2px] bg-current translate-y-[2px]" />
            </button>
          )}
          {allowMaximize && onToggleMaximize && (
            <button
              className={`w-7 h-6 flex items-center justify-center bg-transparent border border-transparent mx-[1px] transition-colors ${buttonClasses}`}
              onClick={(event) => {
                event.stopPropagation();
                onToggleMaximize();
              }}
            >
              <div className={`border-[2px] border-current w-3 h-3 ${isMaximized ? "relative top-[1px] right-[1px]" : ""}`}>
                {isMaximized && <div className="absolute border-[2px] border-current w-3 h-3 -top-1 -right-1 z-[-1]" />}
              </div>
            </button>
          )}
          {onClose && (
            <button
              className={`w-7 h-6 flex items-center justify-center bg-transparent border border-transparent mx-[1px] hover:bg-red-800/70 hover:text-white hover:border-red-500/50 transition-colors ${theme === "cyan" ? "text-[#00D4FF]" : theme === "magenta" ? "text-[#FF00FF]" : "text-green-600"}`}
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
            >
              <span className="font-bold text-sm">X</span>
            </button>
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
