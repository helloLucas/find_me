import { useQuery } from '@tanstack/react-query';
import { CHAPTER_STATUS, useChapterStatus } from '../../entities/Chapter/hooks/useChapterStatus';
import { useChapterNavigate } from '../../features/ChapterSelect/useChapterNavigate';
import { endingApi } from '../../shared/api/endingApi';
import { ChapterCard } from './ui/ChapterCard';

/**
 * 챕터 리스트 위젯
 * - 백엔드에서 받아온 고정된 4개 챕터 데이터를 렌더링합니다.
 * - 렌더링 로직은 ChapterCard 내의 STATUS_CONFIG로 위임합니다.
 */
export const ChapterList = () => {
    const { data: chapters, isLoading, isError } = useChapterStatus();
    const { selectChapter } = useChapterNavigate();
    const shouldResolveEndingSignal = Boolean(
        chapters?.some((chapter) => chapter.code === 'week04' && chapter.status === CHAPTER_STATUS.COMPLETED)
    );
    const { data: endingProgress } = useQuery({
        queryKey: ['endings', 'progress', 'branch-signal'],
        queryFn: endingApi.getProgress,
        enabled: shouldResolveEndingSignal,
        staleTime: 30_000,
    });

    if (isLoading) return null; // 로딩 중 레이아웃 방해 방지
    if (isError) return null;

    return (
        <div className="w-full flex flex-col gap-3 flex-1 min-h-0 pb-2">
            {chapters?.map((chapter) => (
                <ChapterCard
                    key={chapter.code}
                    code={chapter.code}
                    title={chapter.title}
                    status={chapter.status}
                    hasEndingBranchSignal={
                        chapter.code === 'week04'
                        && chapter.status === CHAPTER_STATUS.COMPLETED
                        && Boolean(endingProgress?.hasUnlockedEnding)
                        && !endingProgress?.allUnlocked
                    }
                    onClick={() => selectChapter(chapter.uriHash)}
                />
            ))}
        </div>
    );
};
