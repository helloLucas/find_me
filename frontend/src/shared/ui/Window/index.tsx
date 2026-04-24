import React, { useState } from "react";
import { Rnd } from "react-rnd";
import { useWindowStore } from "../../../app/store/windowStore";
import { DESKTOP_TASKBAR_HEIGHT } from "../../config/desktopWindows";

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
  const { closeWindow, minimizeWindow, maximizeWindow, restoreWindow, focusWindow } = useWindowStore();
  const [size, setSize] = useState<{ width: string | number; height: string | number }>({
    width: defaultWidth,
    height: defaultHeight,
  });
  const [position, setPosition] = useState(() => getInitialWindowPosition(defaultWidth, defaultHeight));

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
        pointerEvents: isMinimized ? "none" : "auto",
      }}
    >
      <div
        className="w-full h-full flex flex-col bg-[#0f0c29] border-2 border-[#543ab7] rounded shadow-[0_0_15px_rgba(84,58,183,0.7)] overflow-hidden transition-all duration-300 ease-in-out origin-bottom"
        style={{
          opacity: isMinimized ? 0 : 1,
          transform: isMinimized ? "scale(0.8) translateY(100px)" : "scale(1) translateY(0)",
        }}
      >
        <div
          className={`window-drag-handle flex items-center justify-between px-2 py-1 bg-gradient-to-r from-[#240b36] to-[#0f0c29] border-b-2 border-[#543ab7] select-none ${!isMaximized ? "cursor-move" : ""}`}
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
            <span className="text-[#a48cff] font-pixel text-sm tracking-wider drop-shadow-[0_0_3px_rgba(164,140,255,0.8)]">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              className="w-5 h-5 flex items-center justify-center text-[#0ff] hover:bg-[#0ff]/20 rounded border border-transparent hover:border-[#0ff]"
              onClick={(event) => {
                event.stopPropagation();
                minimizeWindow(windowState.id);
              }}
              title="Minimize"
            >
              <div className="w-2.5 h-0.5 bg-current translate-y-[3px]" />
            </button>

            <button
              className="w-5 h-5 flex items-center justify-center text-[#0ff] hover:bg-[#0ff]/20 rounded border border-transparent hover:border-[#0ff]"
              onClick={(event) => {
                event.stopPropagation();
                handleToggleMaximize();
              }}
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? (
                <div className="relative w-2.5 h-2.5">
                  <div className="absolute top-0 right-0 w-2 h-2 border border-current" />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border border-current bg-[#0f0c29]" />
                </div>
              ) : (
                <div className="w-2.5 h-2.5 border border-current" />
              )}
            </button>

            <button
              className="w-5 h-5 flex items-center justify-center text-[#ff3366] hover:bg-[#ff3366]/20 rounded border border-transparent hover:border-[#ff3366]"
              onClick={(event) => {
                event.stopPropagation();
                closeWindow(windowState.id);
              }}
              title="Close"
            >
              <div className="relative w-2.5 h-2.5 flex items-center justify-center">
                <div className="absolute w-full h-0.5 bg-current rotate-45" />
                <div className="absolute w-full h-0.5 bg-current -rotate-45" />
              </div>
            </button>
          </div>
        </div>

        <div className="flex-1 w-full h-full relative bg-[#0a0514] overflow-hidden">{children}</div>
      </div>
    </Rnd>
  );
};
