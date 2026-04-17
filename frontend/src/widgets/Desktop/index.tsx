import React, { useMemo } from 'react';
import { DesktopIcon } from '../../shared/ui/DesktopIcon';
import { Taskbar } from '../Taskbar';

export const Desktop: React.FC = () => {
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

  return (
    <div 
      className="relative h-screen w-screen overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: 'url("/display_background.png")' }}
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

      {/* Retro Overlay for atmosphere */}
      <div className="absolute inset-0 bg-indigo-900/10 pointer-events-none mix-blend-overlay" />

      {/* Desktop Icons */}
      <div className="absolute left-4 top-4 flex flex-col gap-2 z-10">
        {icons.map((icon) => (
          <DesktopIcon 
            key={icon.id}
            label={icon.label}
            iconPath={icon.icon}
            onDoubleClick={() => console.log(`Opening ${icon.id}`)}
          />
        ))}
      </div>

      {/* Taskbar */}
      <Taskbar />
    </div>
  );
};
