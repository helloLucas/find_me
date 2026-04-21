import { useChapterStatus } from '../../entities/Chapter/hooks/useChapterStatus';
import { useChapterNavigate } from '../../features/ChapterSelect/useChapterNavigate';
import { ChapterCard } from './ChapterCard';

/**
 * 4. 챕터 리스트 영역 (ChapterList 위젯)
 * - 챕터 데이터를 매핑하여 리스트를 렌더링
 * - 카드가 남는 공간을 균등하게 차지하도록 설계
 */
export const ChapterList = () => {
    const { data: chapters, isLoading, isError } = useChapterStatus();
    const { selectChapter } = useChapterNavigate();

    if (isLoading) return <div className="text-gray-500 font-pixel text-[10px] py-10 tracking-widest text-center animate-pulse">CONNECTING_TO_ARCHIVE_NODE...</div>;
    if (isError) return <div className="text-red-900 font-pixel text-[10px] py-10 text-center uppercase tracking-wider">FATAL_ERROR: NODE_UNREACHABLE</div>;

    return (
        <div className="w-full h-full flex flex-col gap-3 flex-1 min-h-0">
            {chapters?.map((chapter) => {
                // LOCK 여부 판단 로직
                const isLocked = chapter.status === 'TIME_LOCKED' || chapter.status === 'DEPENDENCY_LOCKED';
                
                return (
                    <ChapterCard
                        key={chapter.id}
                        id={chapter.id}
                        title={chapter.title}
                        isLocked={isLocked}
                        chapterHash={chapter.chapterHash}
                        onClick={selectChapter}
                    />
                );
            })}
        </div>
    );
};
