import React from 'react';
import { useParams } from 'react-router-dom';

interface HomeTabProps {
  onNavigate: (url: string, component: "news" | "home" | "pacman" | "history" | "doc", title: string) => void;
  isChapter2Mode?: boolean;
  isChapter3Mode?: boolean;
}

export const HomeTab: React.FC<HomeTabProps> = ({ onNavigate, isChapter2Mode, isChapter3Mode }) => {
  const { chapterCode } = useParams<{ chapterCode?: string }>();

  // URL 및 전역 상태를 모두 결합해 실시간 챕터 모드 0ms 즉시 계산
  const isCh2 = isChapter2Mode || chapterCode === "week02";
  const isCh3 = isChapter3Mode || chapterCode === "week03";

  // Frequently visited dummy data
  const favorites = [
    { name: 'Minigame', icon: '/pixel_chrome_icon.svg', url: 'system://pacman', component: 'pacman' as const, title: 'Pac-Man' },
  ].filter(fav => {
    // 챕터 2 모드이거나 챕터 3 모드일 때는 미니게임(pacman)을 숨김
    if ((isCh2 || isCh3) && fav.component === 'pacman') return false;
    return true;
  });

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0514] font-browser-chrome">
      <div className="text-4xl text-[#a48cff] mb-12 drop-shadow-[0_0_5px_#a48cff] tracking-widest font-bold">
        New Tab
      </div>

      <div className="flex gap-8">
        {favorites.length > 0 ? (
          favorites.map((fav, i) => (
            <button
              key={i}
              className="flex flex-col items-center gap-3 w-20 p-2 rounded hover:bg-white/10 transition-colors"
              title={fav.url}
              onClick={() => onNavigate(fav.url, fav.component, fav.title)}
            >
              <div className="w-12 h-12 rounded bg-[#1a1130] border border-[#543ab7] flex items-center justify-center hover:shadow-[0_0_10px_#543ab7]">
                <img
                  src={fav.icon}
                  alt={fav.name}
                  className="w-8 h-8 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <span className="text-xs text-center text-[#c7b3ff] truncate w-full">
                {fav.name}
              </span>
            </button>
          ))
        ) : (
          <div className="text-[#543ab7] text-sm opacity-50 italic">No favorite items available</div>
        )}
      </div>
    </div>
  );
};
