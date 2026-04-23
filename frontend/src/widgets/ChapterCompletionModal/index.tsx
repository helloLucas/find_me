import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ChapterCompletionModalProps {
  /** 메인 안내 문구 */
  message?: string;
}

/**
 * 챕터 완료 안내 전체화면 오버레이
 * 
 * isTerminal 노드에 도달했을 때 챕터 클리어를 축하하고 로비로 돌아갈 수 있게 합니다.
 */
export const ChapterCompletionModal: React.FC<ChapterCompletionModalProps> = ({
  message = '챕터 클리어',
}) => {
  const navigate = useNavigate();

  const handleReturnToLobby = () => {
    navigate('/lobby');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#05080a]/80 backdrop-blur-[24px] transition-all duration-1000 select-none">
      <div className="hud-fade-in relative text-center p-16 max-w-xl w-full mx-6 flex flex-col items-center gap-14 bg-white/[0.02] border border-green-500/10">
        {/* Glass Container */}
        <div className="absolute inset-0 border border-green-500/20 bg-green-500/[0.02] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] -z-10 rounded-[2px]" />

        {/* Light Reflection */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/[0.08] via-transparent to-transparent -z-10 rounded-[2px]" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-green-500/30 to-transparent -z-10" />

        {/* HUD Corner Brackets */}
        <div className="absolute top-[-4px] left-[-4px] w-5 h-5 border-t border-l border-green-500/40" />
        <div className="absolute top-[-4px] right-[-4px] w-5 h-5 border-t border-r border-green-500/40" />
        <div className="absolute bottom-[-4px] left-[-4px] w-5 h-5 border-b border-l border-green-500/40" />
        <div className="absolute bottom-[-4px] right-[-4px] w-5 h-5 border-b border-r border-green-500/40" />

        <div className="flex flex-col gap-12 w-full">
          {/* System Label */}
          <div className="flex items-center justify-between opacity-30 text-[9px] font-pixel text-green-400 tracking-[0.3em] px-1">
            <span>SYSTEM_SUCCESS</span>
            <span>CHAPTER_COMPLETED</span>
          </div>

          <div className="flex flex-col gap-8">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 border-2 border-green-500/60 rounded-full flex items-center justify-center bg-green-500/10 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                <span className="font-pixel text-2xl text-green-400">✓</span>
              </div>
            </div>

            {/* Main Message */}
            <p className="font-pixel text-[24px] md:text-[32px] text-green-400 tracking-tight leading-relaxed drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]">
              {message}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-8 items-center w-full justify-center mt-6">
            <button
              onClick={handleReturnToLobby}
              className="relative px-8 h-14 flex items-center justify-center group/btn cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <div className="absolute inset-0 border border-green-500/40 group-hover/btn:border-green-500/80 group-hover/btn:shadow-[0_0_20px_rgba(34,197,94,0.3)] rounded-md" />
              <div className="absolute inset-[6px] border border-green-500/20 group-hover/btn:border-green-500/50 bg-green-500/[0.05] flex items-center justify-center rounded-sm">
                <span className="font-pixel text-sm text-green-400/90 group-hover/btn:text-green-300 tracking-wider">
                  메인으로 돌아가기
                </span>
              </div>
              {/* Depth lines */}
              <div className="absolute top-[1px] left-[1px] w-2.5 h-[1px] bg-green-500/30 origin-top-left rotate-45" />
              <div className="absolute top-[1px] right-[1px] w-2.5 h-[1px] bg-green-500/30 origin-top-right -rotate-45" />
              <div className="absolute bottom-[1px] left-[1px] w-2.5 h-[1px] bg-green-500/30 origin-bottom-left -rotate-45" />
              <div className="absolute bottom-[1px] right-[1px] w-2.5 h-[1px] bg-green-500/30 origin-bottom-right rotate-45" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
