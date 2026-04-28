import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../shared/api/axiosInstance';
import type { BaseResponse } from '../../../shared/types/api';

/**
 * 챕터의 활성 상태 상수 (백엔드 API 응답과 1:1 매핑)
 */
export const CHAPTER_STATUS = {
    DISABLED: 'DISABLED',
    LOCKED: 'LOCKED',
    UNLOCKED: 'UNLOCKED',
    COMPLETED: 'COMPLETED',
} as const;

// 챕터 상태 유니온 타입
export type ChapterStatusValue = typeof CHAPTER_STATUS[keyof typeof CHAPTER_STATUS];

export interface Chapter {
    code: string;
    title: string;
    status: ChapterStatusValue;
}

/**
 * 서버로부터 챕터 목록 및 유저 진행 상태를 가져오는 훅
 */
export const useChapterStatus = () => {
    return useQuery<Chapter[]>({
        queryKey: ['chapters', 'progress'],
        queryFn: async () => {
            const response = await axiosInstance.get<BaseResponse<Chapter[]>>('/api/v1/chapters');
            return response.data.data;
        },
        select: (data) => {
            let foundFirstDisabled = false;
            return data.map((chapter) => {
                if (chapter.status === CHAPTER_STATUS.DISABLED && !foundFirstDisabled) {
                    foundFirstDisabled = true;
                    return { ...chapter, title: 'See you in next week' };
                }
                return chapter;
            });
        },
    });
};
