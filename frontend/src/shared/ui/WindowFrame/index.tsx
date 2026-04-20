import React, { useRef, useState, useEffect } from 'react';

interface WindowFrameProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { w: number; h: number };
  minSize?: { w: number; h: number };
}

export const WindowFrame: React.FC<WindowFrameProps> = ({
  title,
  children,
  onClose,
  onMinimize,
  isMinimized = false,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { w: 600, h: 400 },
  minSize = { w: 300, h: 200 }
}) => {
  const windowRef = useRef<HTMLDivElement>(null);
  
  // Local state for maximization only (CSS class toggle is easier for 100% size)
  const [isMaximized, setIsMaximized] = useState(false);

  // Refs for drag and resize geometry tracking (bypassing React render cycle)
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
    resizeDir: ''
  });

  // Apply initial geometry using refs so we don't need a React effect to set it
  useEffect(() => {
    if (windowRef.current && !isMaximized) {
      windowRef.current.style.transform = `translate(${geom.current.x}px, ${geom.current.y}px)`;
      windowRef.current.style.width = `${geom.current.w}px`;
      windowRef.current.style.height = `${geom.current.h}px`;
    }
  }, [isMaximized]);

  // Handle Drag
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return; // Cannot drag if maximized
    geom.current.isDragging = true;
    geom.current.startX = e.clientX;
    geom.current.startY = e.clientY;
    geom.current.startLeft = geom.current.x;
    geom.current.startTop = geom.current.y;

    const onMouseMove = (ev: MouseEvent) => {
      if (!geom.current.isDragging) return;
      const dx = ev.clientX - geom.current.startX;
      const dy = ev.clientY - geom.current.startY;
      geom.current.x = geom.current.startLeft + dx;
      geom.current.y = geom.current.startTop + dy;
      
      // Request animation frame or direct style update
      if (windowRef.current) {
        windowRef.current.style.transform = `translate(${geom.current.x}px, ${geom.current.y}px)`;
      }
    };

    const onMouseUp = () => {
      geom.current.isDragging = false;
      if (windowRef.current) windowRef.current.style.transition = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    if (windowRef.current) windowRef.current.style.transition = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Handle Resize
  const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
    if (isMaximized) return; // Cannot resize if maximized
    e.stopPropagation();
    geom.current.isResizing = true;
    geom.current.resizeDir = direction;
    geom.current.startX = e.clientX;
    geom.current.startY = e.clientY;
    geom.current.startW = geom.current.w;
    geom.current.startH = geom.current.h;
    geom.current.startLeft = geom.current.x;
    geom.current.startTop = geom.current.y;

    const onMouseMove = (ev: MouseEvent) => {
      if (!geom.current.isResizing) return;
      const dx = ev.clientX - geom.current.startX;
      const dy = ev.clientY - geom.current.startY;
      
      let newW = geom.current.startW;
      let newH = geom.current.startH;
      let newX = geom.current.startLeft;
      let newY = geom.current.startTop;

      if (geom.current.resizeDir.includes('e')) newW += dx;
      if (geom.current.resizeDir.includes('s')) newH += dy;
      if (geom.current.resizeDir.includes('w')) {
        newW -= dx;
        newX += dx;
      }
      if (geom.current.resizeDir.includes('n')) {
        newH -= dy;
        newY += dy;
      }

      // Enforce min sizes
      if (newW < minSize.w) {
        if (geom.current.resizeDir.includes('w')) newX -= (minSize.w - newW);
        newW = minSize.w;
      }
      if (newH < minSize.h) {
        if (geom.current.resizeDir.includes('n')) newY -= (minSize.h - newH);
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
      if (windowRef.current) windowRef.current.style.transition = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    if (windowRef.current) windowRef.current.style.transition = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  // Render logic
  // Classic windows style + Retro hacker: Thick gray/green borders, blocky header
  const baseClasses = "absolute flex flex-col overflow-hidden bg-black border-2 border-green-800 shadow-[0_0_20px_rgba(0,255,0,0.15)] ring-1 ring-black transition-all duration-300 ease-in-out origin-bottom";
  
  const stateClasses = isMinimized 
    ? "opacity-0 scale-50 pointer-events-none" 
    : isMaximized 
      ? "!inset-0 !w-full !h-full !transform-none !transition-none z-50 rounded-none border-0" 
      : "opacity-100 scale-100 z-40 rounded-sm";

  return (
    <div 
      ref={windowRef} 
      className={`${baseClasses} ${stateClasses}`}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between bg-gray-900 border-b-2 border-green-900 select-none cursor-move h-8 px-1"
        onMouseDown={handleHeaderMouseDown}
        onDoubleClick={toggleMaximize}
      >
        <div className="flex items-center space-x-2 px-2 text-green-500 font-mono text-sm tracking-wide font-bold">
          {/* Classic small window icon placeholder */}
          <div className="w-3 h-3 bg-green-500 rounded-sm opacity-80" />
          <span>{title}</span>
        </div>

        {/* Buttons (Classic Windows-95/Hacker style) */}
        <div className="flex bg-gray-900 items-center h-full pb-1">
          <button 
            className="w-8 h-6 flex items-center justify-center text-green-600 hover:text-green-300 hover:bg-green-900/50 bg-gray-800 border border-t-gray-700 border-l-gray-700 border-b-gray-950 border-r-gray-950 mx-[1px]"
            onClick={(e) => { e.stopPropagation(); onMinimize?.(); }}
          >
            <span className="mb-2 w-3 h-[2px] bg-current" />
          </button>
          <button 
            className="w-8 h-6 flex items-center justify-center text-green-600 hover:text-green-300 hover:bg-green-900/50 bg-gray-800 border border-t-gray-700 border-l-gray-700 border-b-gray-950 border-r-gray-950 mx-[1px]"
            onClick={(e) => { e.stopPropagation(); toggleMaximize(); }}
          >
            <div className={`border-[2px] border-current w-3 h-3 ${isMaximized ? 'relative top-[1px] right-[1px]' : ''}`}>
              {isMaximized && <div className="absolute border-[2px] border-current w-3 h-3 -top-1 -right-1 z-[-1]" />}
            </div>
          </button>
          <button 
            className="w-8 h-6 flex items-center justify-center text-green-600 hover:text-white hover:bg-red-800 bg-gray-800 border border-t-gray-700 border-l-gray-700 border-b-gray-950 border-r-gray-950 mx-[1px]"
            onClick={(e) => { e.stopPropagation(); onClose?.(); }}
          >
            <span className="font-bold text-sm">X</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden pointer-events-auto bg-black relative">
        {children}
      </div>

      {/* Resize Handles (invisible triggers) */}
      {!isMaximized && !isMinimized && (
        <>
          <div className="absolute top-0 left-0 w-2 h-2 cursor-nwse-resize z-50" onMouseDown={(e) => handleResizeMouseDown(e, 'nw')} />
          <div className="absolute top-0 right-0 w-2 h-2 cursor-nesw-resize z-50" onMouseDown={(e) => handleResizeMouseDown(e, 'ne')} />
          <div className="absolute bottom-0 left-0 w-2 h-2 cursor-nesw-resize z-50" onMouseDown={(e) => handleResizeMouseDown(e, 'sw')} />
          <div className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-50" onMouseDown={(e) => handleResizeMouseDown(e, 'se')} />
          <div className="absolute top-0 left-2 right-2 h-1 cursor-ns-resize z-40" onMouseDown={(e) => handleResizeMouseDown(e, 'n')} />
          <div className="absolute bottom-0 left-2 right-2 h-2 cursor-ns-resize z-40" onMouseDown={(e) => handleResizeMouseDown(e, 's')} />
          <div className="absolute top-2 bottom-2 left-0 w-1 cursor-ew-resize z-40" onMouseDown={(e) => handleResizeMouseDown(e, 'w')} />
          <div className="absolute top-2 bottom-2 right-0 w-2 cursor-ew-resize z-40" onMouseDown={(e) => handleResizeMouseDown(e, 'e')} />
        </>
      )}
    </div>
  );
};
