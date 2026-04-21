import React from 'react';

interface ChapterCardProps {
    id: number;
    title: string; // 데이터로 받지만 UI에서는 'CHAPTER {id}' 형식으로 표시
    status: 'READY' | 'LOCKED';
    chapterHash?: string;
    onClick: (hash?: string) => void;
}

/**
 * - READY: CHAPTER 1 스타일 고정
 * - LOCKED: CHAPTER 2~4 스타일 고정
 */
export const ChapterCard: React.FC<ChapterCardProps> = ({
    id,
    status,
    chapterHash,
    onClick,
}) => {
    const isLocked = status === 'LOCKED';
    const watermarkId = String(id).padStart(2, '0');

    if (isLocked) {
        return (
            <div className="flex-1 border border-gray-700 bg-[#0a0a0a] px-6 py-4 flex flex-col justify-center cursor-not-allowed relative overflow-hidden rounded-sm">
                <div className="z-10">
                    <span className="text-gray-500 text-[10px] md:text-xs tracking-widest block mb-2 font-pixel">🔒 [ LOCKED ]</span>
                    <h2 className="text-gray-400 text-xl md:text-2xl tracking-widest font-pixel">CHAPTER {id}</h2>
                </div>
                <div className="absolute right-4 -bottom-4 text-6xl md:text-[90px] text-gray-800 font-bold pointer-events-none leading-none font-pixel">{watermarkId}</div>
            </div>
        );
    }

    return (
        <div
            onClick={() => onClick(chapterHash)}
            className="flex-1 border border-gray-600 bg-[#0a0c08] px-6 py-4 flex flex-col justify-center group cursor-pointer hover:border-sysgreen hover:bg-[#12170d] transition-all relative overflow-hidden rounded-sm shadow-sm"
        >
            <div className="z-10">
                <span className="text-sysgreen text-[10px] md:text-xs tracking-widest block mb-2 opacity-90 font-pixel">{" > "} [ READY_TO_EXECUTE ]</span>
                <h2 className="text-xl md:text-2xl text-white tracking-widest drop-shadow-sm font-pixel">CHAPTER {id}</h2>
            </div>
            <div className="absolute right-4 -bottom-4 text-6xl md:text-[90px] text-white/10 group-hover:text-sysgreen/10 font-bold transition-colors pointer-events-none leading-none font-pixel">{watermarkId}</div>
        </div>
    );
};
