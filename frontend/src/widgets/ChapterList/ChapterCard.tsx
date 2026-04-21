import React from 'react';

interface ChapterCardProps {
    id: number;
    title: string;
    isLocked: boolean;
    chapterHash?: string;
    onClick: (hash?: string) => void;
}

/**
 * 5. 개별 챕터 카드 (ChapterCard 컴포넌트)
 * - 부드러운 모서리(rounded-sm)와 세련된 여백을 가진 리스트 항목
 * - READY: 강조된 시스템 그린 테두리 및 배경
 * - LOCKED: 완전 투명 배경 및 고대비 텍스트
 */
export const ChapterCard: React.FC<ChapterCardProps> = ({
    id,
    title,
    isLocked,
    chapterHash,
    onClick,
}) => {
    const watermarkId = String(id).padStart(2, '0');

    if (isLocked) {
        return (
            <div className="relative border border-gray-800/40 bg-transparent flex-1 flex flex-col justify-center px-8 py-6 rounded-sm cursor-not-allowed transition-all duration-300">
                <div className="z-10 group">
                    <span className="text-gray-600 text-[9px] uppercase font-pixel tracking-tighter mb-1 block">
                        Chapter {id}
                    </span>
                    <h2 className="text-gray-400 text-lg md:text-xl font-bold uppercase font-pixel tracking-wide leading-tight">
                        {title.replace(/_/g, ' ')}
                    </h2>
                </div>
                
                {/* 대형 픽셀 숫자 워터마크 */}
                <span className="absolute -bottom-4 -right-2 text-7xl md:text-8xl font-black text-white/[0.04] font-pixel leading-none select-none pointer-events-none italic">
                    {watermarkId}
                </span>
            </div>
        );
    }

    return (
        <div
            onClick={() => onClick(chapterHash)}
            className="relative border border-gray-700/50 bg-[#0a0c08] flex-1 flex flex-col justify-center px-8 py-6 rounded-sm cursor-pointer transition-all duration-300 hover:border-[#a3e635] hover:bg-[#12170d] group"
        >
            <div className="z-10">
                <span className="text-[#a3e635]/60 text-[9px] uppercase font-pixel tracking-tighter mb-1 block group-hover:text-[#a3e635]">
                    Chapter {id}
                </span>
                <h2 className="text-[#a3e635] text-lg md:text-xl font-bold uppercase font-pixel tracking-wide leading-tight">
                    {title.replace(/_/g, ' ')}
                </h2>
            </div>

            {/* 대형 픽셀 숫자 워터마크 */}
            <span className="absolute -bottom-4 -right-2 text-7xl md:text-8xl font-black text-white/[0.07] font-pixel leading-none select-none pointer-events-none italic group-hover:text-[#a3e635]/10">
                {watermarkId}
            </span>
        </div>
    );
};
