import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { trackAnalyticsEvent } from '../../shared/analytics';
import axiosInstance from '../../shared/api/axiosInstance';
import { isConnectionError } from '../../shared/api/apiError';
import { openConnectionFailedModal } from '../../app/store/modalStore';

/**
 * 챕터 선택 액션을 처리하는 커스텀 훅
 */
export const useChapterNavigate = () => {
    const navigate = useNavigate();
    const [isSelectingChapter, setIsSelectingChapter] = useState(false);

    const selectChapter = async (chapterHash: string | undefined) => {
        if (!chapterHash || isSelectingChapter) return;

        trackAnalyticsEvent('chapter_selected', {
            chapter_code: chapterHash,
        });

        setIsSelectingChapter(true);

        try {
            // 캐시된 챕터 목록만 믿고 죽은 서버 상태에서 플레이 화면으로 진입하지 않도록,
            // 실제 이동 직전에 백엔드 연결을 한 번 검증합니다.
            await axiosInstance.get('/api/v1/chapters', {
                params: { verify: Date.now() },
            });

            // 챕터 재시작/진입 시 메모 데이터 초기화
            localStorage.removeItem("notebook_memo_content");

            // Triple Lock System: 예측 가능한 ch1 대신 서버에서 받은 해시값으로 이동
            navigate(`/play/${chapterHash}`);
        } catch (error) {
            if (isConnectionError(error)) {
                // 챕터 선택은 사용자가 직접 실행한 액션이므로 쿨다운에 묻히지 않게 명시적으로 알립니다.
                openConnectionFailedModal({ force: true });
            }
        } finally {
            setIsSelectingChapter(false);
        }
    };

    return { selectChapter, isSelectingChapter };
};
