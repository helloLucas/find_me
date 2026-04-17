import React from 'react';

interface DesktopIconProps {
  label: string;
  iconPath: string;
  onDoubleClick: () => void;
}

export const DesktopIcon: React.FC<DesktopIconProps> = ({ label, iconPath, onDoubleClick }) => {
  return (
    <div 
      className="group flex w-20 flex-col items-center gap-1 p-2 transition-all hover:bg-white/10 active:bg-white/20 select-none cursor-pointer"
      onDoubleClick={onDoubleClick}
    >
      <div className="relative h-12 w-12 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-transform group-hover:scale-110">
        <img 
          src={iconPath} 
          alt={label} 
          className="h-full w-full object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>
      <span className="text-center text-[10px] font-medium leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] px-1 break-all">
        {label}
      </span>
    </div>
  );
};
