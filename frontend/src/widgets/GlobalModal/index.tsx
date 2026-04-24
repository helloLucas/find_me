import { useModalStore } from '../../app/store/modalStore';

/**
 * GlobalModal
 * 
 * 전역 상태(useModalStore)에 따라 렌더링되는 사이버펑크 스타일의 공통 모달입니다.
 * alert(확인) 및 confirm(확인/취소) 타입을 지원합니다.
 */
export const GlobalModal = () => {
    const { isOpen, title, message, type, onConfirm, onCancel, closeModal } = useModalStore();

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        closeModal();
    };

    const handleCancel = () => {
        if (onCancel) onCancel();
        closeModal();
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-md transition-all duration-500 animate-in fade-in fill-mode-both">
            <div className="hud-fade-in relative max-w-md w-full mx-6 p-10 flex flex-col items-center gap-10">
                {/* Glass Container */}
                <div className="absolute inset-0 border border-white/10 bg-white/[0.03] shadow-[0_20px_50px_rgba(0,0,0,0.5)] -z-10 rounded-sm" />

                <div className="flex flex-col gap-6 w-full text-center">
                    <div className="flex items-center justify-between opacity-20 text-[8px] font-pixel text-white tracking-[0.3em] mb-2 px-1">
                        <span>SYSTEM_PROMPT</span>
                        <span>{title}</span>
                    </div>

                    <p className="font-pixel text-sm md:text-base text-white/90 leading-relaxed tracking-tight break-keep whitespace-pre-wrap">
                        {message}
                    </p>
                </div>

                <div className="flex gap-8 items-center w-full justify-center">
                    {/* type이 'confirm'인 경우에만 취소 버튼 렌더링 */}
                    {type === 'confirm' && (
                        <button
                            onClick={handleCancel}
                            className="relative w-24 h-14 flex items-center justify-center group/btn cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95"
                        >
                            <div className="absolute inset-0 border border-white/20 group-hover/btn:border-white/40 rounded-md" />
                             <div className="absolute inset-[6px] border border-white/10 group-hover/btn:border-white/30 bg-white/[0.01] flex items-center justify-center rounded-sm">
                                <span className="font-pixel text-[10px] text-white/40 group-hover/btn:text-white/70">취소</span>
                            </div>
                            {/* Depth lines */}
                            <div className="absolute top-[1px] left-[1px] w-2.5 h-[1px] bg-white/10 origin-top-left rotate-45" />
                            <div className="absolute top-[1px] right-[1px] w-2.5 h-[1px] bg-white/10 origin-top-right -rotate-45" />
                            <div className="absolute bottom-[1px] left-[1px] w-2.5 h-[1px] bg-white/10 origin-bottom-left -rotate-45" />
                            <div className="absolute bottom-[1px] right-[1px] w-2.5 h-[1px] bg-white/10 origin-bottom-right rotate-45" />
                        </button>
                    )}

                    {/* Confirm Button */}
                    <button
                        onClick={handleConfirm}
                        className="relative w-24 h-14 flex items-center justify-center group/btn cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95"
                    >
                        <div className="absolute inset-0 border border-white/30 group-hover/btn:border-white/60 group-hover/btn:shadow-[0_0_15px_rgba(255,255,255,0.2)] rounded-md" />
                         <div className="absolute inset-[6px] border border-white/20 group-hover/btn:border-white/50 bg-white/[0.03] flex items-center justify-center rounded-sm">
                            <span className="font-pixel text-[10px] text-white/80 group-hover/btn:text-white">확인</span>
                        </div>
                        {/* Depth lines */}
                        <div className="absolute top-[1px] left-[1px] w-2.5 h-[1px] bg-white/20 origin-top-left rotate-45" />
                        <div className="absolute top-[1px] right-[1px] w-2.5 h-[1px] bg-white/20 origin-top-right -rotate-45" />
                        <div className="absolute bottom-[1px] left-[1px] w-2.5 h-[1px] bg-white/20 origin-bottom-left -rotate-45" />
                        <div className="absolute bottom-[1px] right-[1px] w-2.5 h-[1px] bg-white/20 origin-bottom-right rotate-45" />
                    </button>
                </div>
            </div>
            
            <style>{`
                @keyframes hud-fade-in {
                    0% { opacity: 0; transform: scale(0.95) translateY(10px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
                .hud-fade-in {
                    animation: hud-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};
