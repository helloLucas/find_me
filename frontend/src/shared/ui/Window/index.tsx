import React, { useRef, useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { useWindowStore } from '../../../app/store/windowStore';

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

export const Window: React.FC<WindowProps> = ({ 
  id, 
  title, 
  icon, 
  children,
  defaultWidth = 800,
  defaultHeight = 600,
  minWidth = 400,
  minHeight = 300
}) => {
  const windowState = useWindowStore((state) => state.windows.find(w => w.id === id));
  const { closeWindow, minimizeWindow, maximizeWindow, restoreWindow, focusWindow } = useWindowStore();
  const rndRef = useRef<any>(null);

  // Fully controlled state for Rnd to ensure maximize reliably toggles
  const [size, setSize] = useState<{ width: string | number; height: string | number }>({ width: defaultWidth, height: defaultHeight });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState(false);
  
  // To handle initial centering vaguely
  useEffect(() => {
    const rx = Math.max(0, (window.innerWidth - defaultWidth) / 2) + (Math.random() * 40 - 20);
    const ry = Math.max(0, (window.innerHeight - defaultHeight) / 2) + (Math.random() * 40 - 20);
    setPosition({ x: rx, y: ry });
    setIsReady(true);
  }, [defaultWidth, defaultHeight]);

  if (!windowState || !isReady) {
    return null;
  }

  const isMaximized = windowState.isMaximized;
  const isMinimized = windowState.isMinimized;
  
  const handleToggleMaximize = () => {
    if (isMaximized) {
      restoreWindow(id);
    } else {
      maximizeWindow(id);
    }
  };

  return (
    <Rnd
      ref={rndRef}
      size={isMaximized ? { width: '100vw', height: '100vh' } : size}
      position={isMaximized ? { x: 0, y: 0 } : position}
      onDragStop={(e, d) => {
        if (!isMaximized) setPosition({ x: d.x, y: d.y });
      }}
      onResizeStop={(e, direction, ref, delta, pos) => {
        if (!isMaximized) {
          setSize({ width: ref.style.width, height: ref.style.height });
          setPosition(pos); 
        }
      }}
      minWidth={minWidth}
      minHeight={minHeight}
      onMouseDownCapture={() => focusWindow(id)}
      disableDragging={isMaximized}
      enableResizing={!isMaximized}
      dragHandleClassName="window-drag-handle"
      bounds={isMaximized ? "parent" : "window"}
      style={{
        zIndex: isMaximized ? 3000 : windowState.zIndex,
        pointerEvents: isMinimized ? 'none' : 'auto',
      }}
    >
      {/* Inner Animating Wrapper */}
      <div 
        className="w-full h-full flex flex-col bg-[#0f0c29] border-2 border-[#543ab7] rounded shadow-[0_0_15px_rgba(84,58,183,0.7)] overflow-hidden transition-all duration-300 ease-in-out origin-bottom"
        style={{
          opacity: isMinimized ? 0 : 1,
          transform: isMinimized ? 'scale(0.8) translateY(100px)' : 'scale(1) translateY(0)',
        }}
      >
        {/* Title Bar */}
      <div 
        className={`window-drag-handle flex items-center justify-between px-2 py-1 bg-gradient-to-r from-[#240b36] to-[#0f0c29] border-b-2 border-[#543ab7] select-none ${!isMaximized ? 'cursor-move' : ''}`}
        onDoubleClick={handleToggleMaximize}
      >
        <div className="flex items-center gap-2">
          {icon && <img src={icon} alt="" className="w-4 h-4 object-contain brightness-150" style={{ imageRendering: 'pixelated' }} />}
          <span className="text-[#a48cff] font-pixel text-sm tracking-wider drop-shadow-[0_0_3px_rgba(164,140,255,0.8)]">
            {title}
          </span>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-1">
          <button 
            className="w-5 h-5 flex items-center justify-center text-[#0ff] hover:bg-[#0ff]/20 rounded border border-transparent hover:border-[#0ff]"
            onClick={(e) => { e.stopPropagation(); minimizeWindow(id); }}
            title="Minimize"
          >
            <div className="w-2.5 h-0.5 bg-current translate-y-[3px]" />
          </button>
          
          <button 
            className="w-5 h-5 flex items-center justify-center text-[#0ff] hover:bg-[#0ff]/20 rounded border border-transparent hover:border-[#0ff]"
            onClick={(e) => { e.stopPropagation(); handleToggleMaximize(); }}
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
            onClick={(e) => { e.stopPropagation(); closeWindow(id); }}
            title="Close"
          >
            <div className="relative w-2.5 h-2.5 flex items-center justify-center">
              <div className="absolute w-full h-0.5 bg-current rotate-45" />
              <div className="absolute w-full h-0.5 bg-current -rotate-45" />
            </div>
          </button>
        </div>
      </div>

        {/* Content Area */}
        <div className="flex-1 w-full h-full relative bg-[#0a0514] overflow-hidden">
          {children}
        </div>
      </div>
    </Rnd>
  );
};
