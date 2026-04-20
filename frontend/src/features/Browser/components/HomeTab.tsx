import React from 'react';

export const HomeTab: React.FC = () => {
  // Frequently visited dummy data
  const favorites = [
    { name: 'Terminal', icon: '/pixel_terminal_icon.svg', url: 'system://cmd' },
    { name: 'Browser', icon: '/pixel_chrome_icon.svg', url: 'system://browser' },
    { name: 'Notepad', icon: '/pixel_notepad_icon.svg', url: 'system://notes' },
    { name: 'Recycle', icon: '/pixel_trash_icon.svg', url: 'system://trash' },
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0514] font-pixel">
      <div className="text-4xl text-[#a48cff] mb-12 drop-shadow-[0_0_5px_#a48cff] tracking-widest font-bold">
        New Tab
      </div>

      <div className="flex gap-8">
        {favorites.map((fav, i) => (
          <button 
            key={i} 
            className="flex flex-col items-center gap-3 w-20 p-2 rounded hover:bg-white/10 transition-colors"
            title={fav.url}
          >
            <div className="w-12 h-12 rounded bg-[#1a1130] border border-[#543ab7] flex items-center justify-center hover:shadow-[0_0_10px_#543ab7]">
              <img 
                src={fav.icon} 
                alt={fav.name} 
                className="w-8 h-8 object-contain" 
                style={{ imageRendering: 'pixelated' }} 
              />
            </div>
            <span className="text-xs text-center text-[#c7b3ff] truante w-full">
              {fav.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
