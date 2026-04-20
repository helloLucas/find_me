import React from 'react';
import { Clock } from '../../shared/ui/Clock';
import { useClientStore } from '../../app/store/clientStore';
import { useWindowStore } from '../../app/store/windowStore';

export const Taskbar: React.FC = () => {
  const { isTerminalOpen, isTerminalMinimized, restoreTerminal, minimizeTerminal, terminalUser, terminalHost, terminalPath } = useClientStore();
  const { windows, focusWindow, minimizeWindow, activeWindowId } = useWindowStore();

  const handleTerminalTaskbarClick = () => {
    if (isTerminalMinimized) {
      restoreTerminal();
    } else {
      minimizeTerminal();
    }
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-10 w-full border-t border-white/10 bg-black/40 backdrop-blur-md px-1 flex items-center justify-between z-[4000] pixel-font">
      <div className="flex h-full items-center gap-1">
        {/* Start Button */}
        <button className="flex h-8 w-8 items-center justify-center rounded transition-all hover:bg-white/20 active:bg-white/30 hover:shadow-[0_0_10px_rgba(255,255,255,0.2)]">
          <img src="/pixel_messanger_icon.svg" alt="Start" className="h-6 w-6 object-contain" style={{ imageRendering: 'pixelated' }} />
        </button>

        {/* Shortcuts */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded transition-all hover:bg-white/20 active:bg-white/30 hover:shadow-[0_0_10px_rgba(34,211,238,0.2)]"
          onClick={() => useWindowStore.getState().openWindow('browser', 'Web Browser', 'chrome')}
        >
          <img src="/pixel_chrome_icon.svg" alt="Chrome" className="h-5 w-5 object-contain" style={{ imageRendering: 'pixelated' }} />
        </button>

        <div className="h-6 w-px bg-white/10 mx-1" />

        {/* Taskbar Windows list */}
        <div className="flex items-center gap-1">
          {isTerminalOpen && (
            <button
              onClick={handleTerminalTaskbarClick}
              className={`flex h-8 px-3 items-center justify-start min-w-[150px] max-w-[200px] rounded truncate text-green-400 text-xs transition-all pixel-font ${
                isTerminalMinimized
                  ? 'bg-white/10 hover:bg-white/20 active:bg-white/30'
                  : 'bg-white/20 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-green-400 mr-2 opacity-80 shrink-0" />
              <span className="truncate">{terminalUser}@{terminalHost}:{terminalPath}$</span>
            </button>
          )}

          {windows.map(win => {
            const isActive = !win.isMinimized && activeWindowId === win.id;
            return (
              <button
                key={win.id}
                onClick={() => win.isMinimized || !isActive ? focusWindow(win.id) : minimizeWindow(win.id)}
                className={`flex items-center px-2 py-1 h-8 max-w-[150px] rounded border ${isActive
                    ? 'bg-white/20 border-white/30 shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]'
                    : 'bg-transparent border-transparent hover:bg-white/10'
                  } transition-all`}
              >
                <img src="/pixel_chrome_icon.svg" className="w-4 h-4 mr-2 object-contain" style={{ imageRendering: 'pixelated' }} />
                <span className="text-white text-xs truncate leading-none">{win.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mr-2 flex items-center gap-3">
        {/* Status Area */}
        <div className="flex items-center gap-2 px-2">
          <img src="/pixel_wifi.svg" alt="WiFi" className="h-4 w-4 object-contain brightness-90" style={{ imageRendering: 'pixelated' }} />
          <img src="/pixel_signal.svg" alt="Signal" className="h-4 w-4 object-contain brightness-90" style={{ imageRendering: 'pixelated' }} />
        </div>

        <Clock />
      </div>
    </footer>
  );
};
