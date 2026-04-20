import React, { useMemo, useState } from 'react';
import { DesktopIcon } from '../../shared/ui/DesktopIcon';
import { Taskbar } from '../Taskbar';
import { TerminalScene } from '../../features/command-input/TerminalScene';
import { useClientStore } from '../../app/store/clientStore';
import { useWindowStore } from '../../app/store/windowStore';
import { Window } from '../../shared/ui/Window';
import { Browser } from '../../features/Browser';

export const Desktop: React.FC = () => {
  const { openTerminal } = useClientStore();
  const { windows, openWindow } = useWindowStore();
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [showCoreCharacter, setShowCoreCharacter] = useState(false);

  React.useEffect(() => {
    const handleSpawn = () => setShowCoreCharacter(true);
    window.addEventListener('SPAWN_CORE_CHARACTER', handleSpawn);
    return () => window.removeEventListener('SPAWN_CORE_CHARACTER', handleSpawn);
  }, []);

  // Generate rain drops
  const rainDrops = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${0.5 + Math.random() * 0.5}s`,
      opacity: 0.1 + Math.random() * 0.3,
    }));
  }, []);

  const icons = [
    { id: 'terminal', label: 'Terminal', icon: '/pixel_terminal_icon.svg' },
    { id: 'trash', label: 'Recycle Bin', icon: '/pixel_trash_icon.svg' },
    { id: 'chrome', label: 'Browser', icon: '/pixel_chrome_icon.svg' },
    { id: 'notepad', label: 'Notebook', icon: '/pixel_notepad_icon.svg' },
  ];

  const handleIconDoubleClick = (id: string, iconUrl?: string) => {
    if (id === 'terminal') {
      openTerminal();
    } else if (id === 'chrome') {
      openWindow('browser', 'Web Browser', id);
    } else {
      console.log(`Opening ${id}`);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectionBox({
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (selectionBox) {
      setSelectionBox({ ...selectionBox, currentX: e.clientX, currentY: e.clientY });
    }
  };

  const handleMouseUp = () => {
    if (selectionBox) {
      setSelectionBox(null);
    }
  };

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-cover bg-center select-none"
      style={{ backgroundImage: 'url("/display_background.png")' }}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Rain Effect */}
      <div className="rain-container">
        {rainDrops.map((drop) => (
          <div
            key={drop.id}
            className="rain-drop"
            style={{
              left: drop.left,
              animationDelay: drop.delay,
              animationDuration: drop.duration,
              opacity: drop.opacity
            }}
          />
        ))}
      </div>

      {/* Drag Selection Box */}
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

      {/* Retro Overlay for atmosphere */}
      <div className="absolute inset-0 bg-indigo-900/10 pointer-events-none mix-blend-overlay" />

      {/* Desktop Icons */}
      <div className="absolute left-4 top-4 flex flex-col gap-2 z-10 w-24">
        {icons.map((icon) => (
          <DesktopIcon
            key={icon.id}
            label={icon.label}
            iconPath={icon.icon}
            onDoubleClick={() => handleIconDoubleClick(icon.id, icon.icon)}
          />
        ))}
      </div>

      {/* Core Character Easter Egg */}
      {showCoreCharacter && (
        <div className="absolute bottom-16 right-16 z-[5000] animate-bounce pointer-events-none drop-shadow-[0_0_15px_#0ff]">
          <div className="w-16 h-16 bg-[#0a0514] border-2 border-[#0ff] rounded-lg flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 w-full h-1 bg-[#0ff]/50 animate-pulse" />
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-[#ff3366] rounded-full animate-pulse" />
              <div className="w-3 h-3 bg-[#ff3366] rounded-full animate-pulse" />
            </div>
            <div className="absolute bottom-3 w-6 h-1 bg-[#0ff] rounded-full" />
          </div>
          <div className="text-[#0ff] font-pixel text-xs mt-2 text-center drop-shadow-[0_0_5px_#0ff] tracking-widest bg-black/50 px-2 py-1 rounded">
            CORE.ONLINE
          </div>
        </div>
      )}

      {/* Terminal Modals/Scenes on top of Desktop */}
      <TerminalScene />

      {/* Windows Manager */}
      {windows.map((win) => (
        <Window
          key={win.id}
          id={win.id}
          title={win.title}
          icon={icons.find(i => i.id === win.id)?.icon}
        >
          {win.type === 'browser' && <Browser windowId={win.id} />}
        </Window>
      ))}

      {/* Taskbar */}
      <Taskbar />
    </div>
  );
};
