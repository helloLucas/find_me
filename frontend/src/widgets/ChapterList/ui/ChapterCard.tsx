import { CHAPTER_STATUS, type ChapterStatusValue } from '../../../entities/Chapter/hooks/useChapterStatus';
import { useModalStore } from '../../../app/store/modalStore';

interface ChapterCardProps {
    code: string;
    title: string;
    status: ChapterStatusValue;
    onClick: () => void;
}

// 챕터 식별자 추출 유틸리티 (예: 'week01' -> 1)
const extractChapterNumber = (code: string) => {
    const numMatch = code.match(/\d+/);
    return numMatch ? parseInt(numMatch[0], 10) : 0;
};

// 전략 패턴: 상태별 렌더링 및 이벤트 설정 객체 (if-else 구조 제거)
const STATUS_CONFIG: Record<ChapterStatusValue, {
    containerClass: string;
    label: string;
    labelClass: string;
    titleClass: string;
    watermarkClass: string;
    action: (onClick: () => void, openModal: any) => void;
}> = {
    [CHAPTER_STATUS.DISABLED]: {
        containerClass: "border-gray-800/40 bg-transparent cursor-not-allowed opacity-50",
        label: "🚫 [ NOT_AVAILABLE ]",
        labelClass: "text-gray-600",
        titleClass: "text-gray-500",
        watermarkClass: "text-white/[0.02]",
        action: (_, openModal) => openModal({
            title: 'SYSTEM_LOCK',
            message: '아직 시스템에 배포되지 않은 챕터입니다.',
            type: 'alert'
        }),
    },
    [CHAPTER_STATUS.LOCKED]: {
        containerClass: "border-gray-700 bg-[#0a0a0a] cursor-not-allowed",
        label: "🔒 [ LOCKED ]",
        labelClass: "text-gray-500",
        titleClass: "text-gray-400",
        watermarkClass: "text-gray-800",
        action: (_, openModal) => openModal({
            title: 'SECURITY_ENFORCEMENT',
            message: '아직 접근할 수 없습니다. 이전 챕터를 클리어해주세요.',
            type: 'alert'
        }),
    },
    [CHAPTER_STATUS.UNLOCKED]: {
        containerClass: "border-gray-600 bg-[#0a0c08] hover:border-[#a3e635] hover:bg-[#12170d] cursor-pointer group shadow-sm",
        label: "> [ READY_TO_EXECUTE ]",
        labelClass: "text-[#a3e635] opacity-90",
        titleClass: "text-white",
        watermarkClass: "text-white/10 group-hover:text-[#a3e635]/10",
        action: (onClick) => onClick(),
    },
    [CHAPTER_STATUS.COMPLETED]: {
        containerClass: "border-[#a3e635]/40 bg-[#0a0c08] hover:border-[#a3e635] hover:bg-[#12170d] cursor-pointer group shadow-[0_0_15px_rgba(163,230,53,0.15)]",
        label: "✔ [ COMPLETED ]",
        labelClass: "text-[#a3e635]",
        titleClass: "text-[#a3e635]",
        watermarkClass: "text-[#a3e635]/10 group-hover:text-[#a3e635]/20",
        action: (onClick) => onClick(),
    }
};

export const ChapterCard: React.FC<ChapterCardProps> = ({
    code,
    title,
    status,
    onClick,
}) => {
    const openModal = useModalStore((state) => state.openModal);
    // 안전장치: 매핑되지 않은 status가 들어올 경우 LOCKED 처리
    const config = STATUS_CONFIG[status] || STATUS_CONFIG[CHAPTER_STATUS.LOCKED];
    const chapterId = extractChapterNumber(code);
    const watermarkId = String(chapterId).padStart(2, '0');

    return (
        <div
            onClick={() => config.action(onClick, openModal)}
            className={`flex-1 border px-6 py-4 flex flex-col justify-center relative overflow-hidden rounded-sm transition-all duration-300 ${config.containerClass}`}
        >
            <div className="z-10">
                <span className={`text-[10px] md:text-xs tracking-widest block mb-1 font-pixel ${config.labelClass}`}>
                    {config.label}
                </span>
                <h2 className={`text-xl md:text-2xl tracking-widest font-pixel ${config.titleClass}`}>
                    CHAPTER {chapterId}
                </h2>
                <h3 className={`text-xs md:text-sm mt-1 uppercase tracking-wider font-pixel opacity-70 ${config.titleClass}`}>
                    {title}
                </h3>
            </div>

            <div className={`absolute right-4 -bottom-4 text-6xl md:text-[90px] font-bold pointer-events-none leading-none font-pixel transition-colors ${config.watermarkClass}`}>
                {watermarkId}
            </div>
        </div>
    );
};
