import { useChapterStatus } from '../../entities/Chapter/hooks/useChapterStatus';
import { useChapterNavigate } from '../../features/ChapterSelect/useChapterNavigate';
import { ChapterCard } from './ui/ChapterCard';

/**
 * 챕터 리스트 위젯 (엄격 지시사항 반영 버전)
 * - 첫 번째 챕터(sort_order: 1)만 READY 스타일 적용
 * - 나머지는 LOCKED 스타일 고정
 */
export const ChapterList = () => {
    const { data: chapters, isLoading, isError } = useChapterStatus();
    const { selectChapter } = useChapterNavigate();

    if (isLoading) return null; // 프로토타입 디자인 유지를 위해 로딩 중에도 레이아웃 방해 금지
    if (isError) return null;

    // id 순으로 정렬
    const sortedChapters = chapters ? [...chapters].sort((a, b) => a.id - b.id) : [];

    return (
        <div className="w-full flex flex-col gap-3 flex-1 min-h-0 pb-2">
            {sortedChapters.map((chapter) => {
                // [임시] 첫 번째 챕터만 READY, 나머지는 LOCKED 루프
                const status = (chapter.id === 1) ? 'READY' : 'LOCKED';

                return (
                    <ChapterCard
                        key={chapter.id}
                        id={chapter.id}
                        title={chapter.title} // 전달은 하되 카드 내부에서 CHAPTER {id}로 재정의됨
                        status={status}
                        chapterHash={chapter.chapterHash}
                        onClick={selectChapter}
                    />
                );
            })}
        </div>
    );
};
