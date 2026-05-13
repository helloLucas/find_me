import { CHAPTER_STATUS, type ChapterStatusValue } from '../../../entities/Chapter/hooks/useChapterStatus';
import { useTranslation } from 'react-i18next';
import { useModalStore } from '../../../app/store/modalStore';
import { trackAnalyticsEvent } from '../../../shared/analytics';

interface ChapterCardProps {
    code: string;
    title: string;
    status: ChapterStatusValue;
    hasEndingBranchSignal?: boolean;
    onClick: () => void;
}

// 챕터 식별자 추출 유틸리티 (예: 'week01' -> 1)
const extractChapterNumber = (code: string) => {
    const numMatch = code.match(/\d+/);
    return numMatch ? parseInt(numMatch[0], 10) : 0;
};

// --- Pixel Art Icons ---
const PixelLock = () => (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="mr-2">
        <path d="M5 5V4C5 2.34315 6.34315 1 8 1C9.65685 1 11 2.34315 11 4V5H13V15H3V5H5ZM7 5H9V4C9 3.44772 8.55228 3 8 3C7.44772 3 7 3.44772 7 4V5Z" />
    </svg>
);

const PixelX = () => (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="mr-2">
        <path d="M3 3H5V5H7V7H9V5H11V3H13V5H11V7H9V9H11V11H13V13H11V11H9V9H7V11H5V13H3V11H5V9H7V7H5V5H3V3Z" />
    </svg>
);

const PixelCheck = () => (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="mr-2">
        <path d="M13 3H15V5H13V7H11V9H9V11H7V13H5V11H3V9H1V7H3V9H5V11H7V9H9V7H11V5H13V3Z" className="hidden" />
        <path d="M2 8L4 10L7 13L11 7L14 4" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="square" />
    </svg>
);

const PixelArrow = () => (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="mr-2">
        <path d="M4 3H6V5H8V7H10V9H8V11H6V13H4V11H6V9H8V7H6V5H4V3Z" />
    </svg>
);

// 전략 패턴: 상태별 렌더링 및 이벤트 설정 객체 (if-else 구조 제거)
const getStatusConfig = (t: any): Record<ChapterStatusValue, {
    containerClass: string;
    label: string;
    icon: React.ReactNode;
    labelClass: string;
    titleClass: string;
    watermarkClass: string;
    action: (onClick: () => void, openModal: any) => void;
}> => ({
    [CHAPTER_STATUS.DISABLED]: {
        containerClass: "border-gray-700 bg-gray-900/10 cursor-not-allowed opacity-70",
        label: t('lobby.status.notAvailable'),
        icon: <PixelX />,
        labelClass: "text-gray-400",
        titleClass: "text-gray-300",
        watermarkClass: "text-gray-800/80",
        action: (_, openModal) => openModal({
            title: t('lobby.modal.lockTitle'),
            message: t('lobby.modal.lockMsg'),
            type: 'alert'
        }),
    },
    [CHAPTER_STATUS.LOCKED]: {
        containerClass: "border-gray-700 bg-[#0a0a0a] cursor-not-allowed",
        label: t('lobby.status.accessLocked'),
        icon: <PixelLock />,
        labelClass: "text-gray-500",
        titleClass: "text-gray-400",
        watermarkClass: "text-gray-800",
        action: (_, openModal) => openModal({
            title: t('lobby.modal.securityTitle'),
            message: t('lobby.modal.securityMsg'),
            type: 'alert'
        }),
    },
    [CHAPTER_STATUS.UNLOCKED]: {
        containerClass: "border-gray-600 bg-[#0a0c08] hover:border-[#a3e635] hover:bg-[#12170d] cursor-pointer group shadow-sm",
        label: t('lobby.status.readyToSync'),
        icon: <PixelArrow />,
        labelClass: "text-[#a3e635] opacity-90",
        titleClass: "text-white",
        watermarkClass: "text-white/10 group-hover:text-[#a3e635]/10",
        action: (onClick) => onClick(),
    },
    [CHAPTER_STATUS.COMPLETED]: {
        containerClass: "border-[#a3e635]/40 bg-[#0a0c08] hover:border-[#a3e635] hover:bg-[#12170d] cursor-pointer group shadow-[0_0_15px_rgba(163,230,53,0.15)]",
        label: t('lobby.status.systemCleared'),
        icon: <PixelCheck />,
        labelClass: "text-[#a3e635]",
        titleClass: "text-[#a3e635]",
        watermarkClass: "text-[#a3e635]/10 group-hover:text-[#a3e635]/20",
        action: (onClick) => onClick(),
    }
});

export const ChapterCard: React.FC<ChapterCardProps> = ({
    code,
    title,
    status,
    hasEndingBranchSignal = false,
    onClick,
}) => {
    const { t } = useTranslation();
    const openModal = useModalStore((state) => state.openModal);

    const statusConfig = getStatusConfig(t);
    // 안전장치: 매핑되지 않은 status가 들어올 경우 LOCKED 처리
    const config = statusConfig[status] || statusConfig[CHAPTER_STATUS.LOCKED];
    const isEndingBranchSignal = status === CHAPTER_STATUS.COMPLETED && hasEndingBranchSignal;
    const containerClass = isEndingBranchSignal
        ? "border-[#67e8f9]/45 bg-[#061014] hover:border-[#67e8f9] hover:bg-[#071a20] cursor-pointer group shadow-[0_0_15px_rgba(103,232,249,0.14)]"
        : config.containerClass;
    const labelClass = isEndingBranchSignal ? "text-[#67e8f9]" : config.labelClass;
    const titleClass = isEndingBranchSignal ? "text-[#dffbff]" : config.titleClass;
    const watermarkClass = isEndingBranchSignal
        ? "text-[#67e8f9]/10 group-hover:text-[#67e8f9]/20"
        : config.watermarkClass;
    const statusIcon = isEndingBranchSignal ? <PixelArrow /> : config.icon;
    const statusLabel = isEndingBranchSignal ? "ENDING_BRANCH_SIGNAL" : config.label;
    const clearedStampLabel = isEndingBranchSignal ? "BRANCH SIGNAL" : t('lobby.cleared');
    const chapterId = extractChapterNumber(code);
    const watermarkId = String(chapterId).padStart(2, '0');

    return (
        <div
            onClick={() => {
                trackAnalyticsEvent('chapter_card_clicked', {
                    chapter_code: code,
                    chapter_number: chapterId,
                    chapter_status: status,
                });
                config.action(onClick, openModal);
            }}
            className={`flex-1 border px-6 py-6 flex flex-col justify-center relative overflow-hidden rounded-sm transition-all duration-300 ${containerClass}`}
        >
            <div className="z-10">
                <span className={`text-[10px] md:text-sm tracking-widest flex items-center mb-1 font-lobby ${labelClass}`}>
                    {statusIcon}
                    {statusLabel}
                </span>
                <h2 className={`text-xl md:text-2xl tracking-widest font-lobby ${titleClass}`}>
                    {t('lobby.chapter')} {chapterId}
                </h2>
                <h3 className={`text-xs md:text-sm mt-1 uppercase tracking-wider font-lobby opacity-70 ${titleClass}`}>
                    {title}
                </h3>
                {isEndingBranchSignal && (
                    <p className="mt-2 text-[10px] md:text-xs tracking-[0.12em] font-lobby text-[#67e8f9]/80">
                        다른 결말의 신호가 남아 있습니다
                    </p>
                )}
            </div>

            <div className={`absolute right-4 -bottom-4 text-6xl md:text-[90px] font-bold pointer-events-none leading-none font-lobby transition-colors ${watermarkClass}`}>
                {watermarkId}
            </div>

            {/* Cleared Stamp (Visible only when COMPLETED) */}
            {status === CHAPTER_STATUS.COMPLETED && (
                <div className={`absolute top-4 right-6 z-20 border-2 text-[10px] md:text-xs px-2 py-1 font-lobby rotate-12 bg-black/40 backdrop-blur-sm animate-in zoom-in duration-300 ${isEndingBranchSignal
                        ? "border-[#67e8f9] text-[#67e8f9] shadow-[0_0_10px_rgba(103,232,249,0.25)]"
                        : "border-[#a3e635] text-[#a3e635] shadow-[0_0_10px_rgba(163,230,53,0.3)]"
                    }`}>
                    [ {clearedStampLabel} ]
                </div>
            )}
        </div>
    );
};
