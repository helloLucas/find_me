import React from 'react';
import { Clock } from '../../shared/ui/Clock';

export const Taskbar: React.FC = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-10 w-full border-t border-white/10 bg-black/40 backdrop-blur-md px-1 flex items-center justify-between z-[2000] pixel-font">
      <div className="flex h-full items-center gap-1">
        {/* Start Button */}
        <button className="flex h-8 w-8 items-center justify-center rounded transition-all hover:bg-white/20 active:bg-white/30 hover:shadow-[0_0_10px_rgba(255,255,255,0.2)]">
          <img src="/pixel_messanger_icon.svg" alt="Start" className="h-6 w-6 object-contain" style={{ imageRendering: 'pixelated' }} />
        </button>

        {/* Shortcuts */}
        <button className="flex h-8 w-8 items-center justify-center rounded transition-all hover:bg-white/20 active:bg-white/30 hover:shadow-[0_0_10px_rgba(34,211,238,0.2)]">
          <img src="/pixel_chrome_icon.svg" alt="Chrome" className="h-5 w-5 object-contain" style={{ imageRendering: 'pixelated' }} />
        </button>

        <div className="h-6 w-px bg-white/10 mx-1" />

        {/* Taskbar Windows list will go here */}
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
