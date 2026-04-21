import { useQuery } from '@tanstack/react-query';

/**
 * 챕터의 활성 상태 타입
 * - TIME_LOCKED: 아직 배포일이 지나지 않음
 * - DEPENDENCY_LOCKED: 이전 챕터를 클리어하지 않음
 * - READY: 새로 시작 가능
 * - CONTINUE: 진행 중인 세이브 데이터가 있음
 */
export type ChapterStatus = 'TIME_LOCKED' | 'DEPENDENCY_LOCKED' | 'READY' | 'CONTINUE';

export interface Chapter {
    id: number;
    title: string;
    releaseDate: string; // ISO 8601 (YYYY-MM-DD)
    status: ChapterStatus;
    chapterHash?: string; // 진입 가능한 경우에만 제공되는 UUID/Hash
}

/**
 * [Mock] 서버로부터 챕터 목록 및 유저 진행 상태를 가져오는 훅
 */
export const useChapterStatus = () => {
    return useQuery<Chapter[]>({
        queryKey: ['chapters', 'status'],
        queryFn: async () => {
            // 실제 환경에서는 API 호출 (GET /api/chapters/status)
            await new Promise((resolve) => setTimeout(resolve, 500));

            const now = new Date();
            
            // 기준 데이터 (2026년 배포 일정)
            const rawData = [
                { id: 1, title: 'Chapter 1: The First Breach', releaseDate: '2026-04-24', hasSave: true, isPrevCleared: true },
                { id: 2, title: 'Chapter 2: Shadow Protocol', releaseDate: '2026-05-01', hasSave: false, isPrevCleared: true },
                { id: 3, title: 'Chapter 3: Zero-Day Alarm', releaseDate: '2026-05-08', hasSave: false, isPrevCleared: false },
                { id: 4, title: 'Chapter 4: Final Revelation', releaseDate: '2026-05-15', hasSave: false, isPrevCleared: false },
            ];

            return rawData.map((ch): Chapter => {
                const release = new Date(ch.releaseDate);
                const isReleased = now >= release;

                let status: ChapterStatus = 'READY';

                if (!isReleased) {
                    status = 'TIME_LOCKED';
                } else if (!ch.isPrevCleared) {
                    status = 'DEPENDENCY_LOCKED';
                } else if (ch.hasSave) {
                    status = 'CONTINUE';
                }

                return {
                    id: ch.id,
                    title: ch.title,
                    releaseDate: ch.releaseDate,
                    status,
                    // 진입 가능한 경우에만 가상 해시값 부여
                    chapterHash: status === 'READY' || status === 'CONTINUE' 
                        ? `mock-hash-${ch.id}-${Math.random().toString(36).substring(2, 7)}` 
                        : undefined,
                };
            });
        },
    });
};
