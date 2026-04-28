import React from 'react';

interface ExitGameOverlayProps {
  onConfirm: () => void;
  onCancel: () => void;
  /** 메인 안내 문구 (기본: "정말로 게임을 종료하시겠습니까?") */
  message?: string;
  /** 보조 설명 문구 (기본: 빈 문자열 — 표시 안 함) */
  subMessage?: string;
}

/**
 * 게임 종료 확인 전체화면 오버레이
 * 
 * FullscreenEnforcer의 HUD 오버레이 디자인 + Home.tsx의 Line-Art 3D 버튼 패턴을 조합.
 * Taskbar에서 종료 버튼 클릭 시 표시되며, 확인 시 로비로 이동한다.
 * message / subMessage를 props로 주입하면 챕터별로 다른 안내 문구를 표시할 수 있다.
 */
export const ExitGameOverlay: React.FC<ExitGameOverlayProps> = ({
  onConfirm,
  onCancel,
  message = '정말로 게임을 종료하시겠습니까?',
  subMessage,
}) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#05080a]/70 backdrop-blur-[24px] transition-all duration-1000 select-none">
      <div className="hud-fade-in relative text-center p-16 max-w-xl w-full mx-6 flex flex-col items-center gap-14 bg-white/[0.01] border border-white/5">
        {/* Glass Container */}
        <div className="absolute inset-0 border border-white/10 bg-white/[0.02] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] -z-10 rounded-[2px]" />

        {/* Light Reflection */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent -z-10 rounded-[2px]" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent -z-10" />

        {/* HUD Corner Brackets */}
        <div className="absolute top-[-4px] left-[-4px] w-5 h-5 border-t border-l border-white/40" />
        <div className="absolute top-[-4px] right-[-4px] w-5 h-5 border-t border-r border-white/40" />
        <div className="absolute bottom-[-4px] left-[-4px] w-5 h-5 border-b border-l border-white/40" />
        <div className="absolute bottom-[-4px] right-[-4px] w-5 h-5 border-b border-r border-white/40" />

        <div className="flex flex-col gap-12 w-full">
          {/* System Label */}
          <div className="flex items-center justify-between opacity-10 text-[9px] font-pixel text-white tracking-[0.3em] px-1">
            <span>SYSTEM_EXIT_PROTOCOL</span>
            <span>TERMINATE_SESSION</span>
          </div>

          <div className="flex flex-col gap-8">
            {/* Warning Icon */}
            <div className="flex justify-center">
              <div className="w-12 h-12 border-2 border-red-500/40 rounded-full flex items-center justify-center">
                <span className="font-pixel text-xl text-red-500/80">!</span>
              </div>
            </div>

            {/* Main Message */}
            <p className="font-pixel text-[20px] md:text-[24px] text-white/90 tracking-tight leading-relaxed drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
              {message}
            </p>

            {/* Sub Message */}
            {subMessage && (
              <p className="font-pixel text-xs text-white/30 tracking-wide leading-relaxed">
                {subMessage}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-8 items-center w-full justify-center mt-4">
            {/* Cancel Button (Line-Art style — from Home.tsx pattern) */}
            <button
              onClick={onCancel}
              className="relative w-20 h-14 flex items-center justify-center group/btn cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95"
            >
              <div className="absolute inset-0 border border-white/20 group-hover/btn:border-white/40 rounded-md" />
              <div className="absolute inset-[6px] border border-white/10 group-hover/btn:border-white/30 bg-white/[0.01] flex items-center justify-center rounded-sm">
                <span className="font-pixel text-xs text-white/40 group-hover/btn:text-white/70">취소</span>
              </div>
              {/* Depth lines */}
              <div className="absolute top-[1px] left-[1px] w-2.5 h-[1px] bg-white/10 origin-top-left rotate-45" />
              <div className="absolute top-[1px] right-[1px] w-2.5 h-[1px] bg-white/10 origin-top-right -rotate-45" />
              <div className="absolute bottom-[1px] left-[1px] w-2.5 h-[1px] bg-white/10 origin-bottom-left -rotate-45" />
              <div className="absolute bottom-[1px] right-[1px] w-2.5 h-[1px] bg-white/10 origin-bottom-right rotate-45" />
            </button>

            {/* Confirm Button (Line-Art style — red accent for exit warning) */}
            <button
              onClick={onConfirm}
              className="relative w-20 h-14 flex items-center justify-center group/btn cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95"
            >
              <div className="absolute inset-0 border border-red-500/30 group-hover/btn:border-red-500/60 group-hover/btn:shadow-[0_0_15px_rgba(239,68,68,0.2)] rounded-md" />
              <div className="absolute inset-[6px] border border-red-500/20 group-hover/btn:border-red-500/50 bg-red-500/[0.03] flex items-center justify-center rounded-sm">
                <span className="font-pixel text-xs text-red-400/80 group-hover/btn:text-red-400">종료</span>
              </div>
              {/* Depth lines */}
              <div className="absolute top-[1px] left-[1px] w-2.5 h-[1px] bg-red-500/20 origin-top-left rotate-45" />
              <div className="absolute top-[1px] right-[1px] w-2.5 h-[1px] bg-red-500/20 origin-top-right -rotate-45" />
              <div className="absolute bottom-[1px] left-[1px] w-2.5 h-[1px] bg-red-500/20 origin-bottom-left -rotate-45" />
              <div className="absolute bottom-[1px] right-[1px] w-2.5 h-[1px] bg-red-500/20 origin-bottom-right rotate-45" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
