import { useNavigate } from 'react-router-dom';
import { trackAnalyticsEvent } from '../../shared/analytics';

/**
 * 챕터 선택 액션을 처리하는 커스텀 훅
 */
export const useChapterNavigate = () => {
    const navigate = useNavigate();

    const selectChapter = (chapterHash: string | undefined) => {
        if (!chapterHash) return;

        trackAnalyticsEvent('chapter_selected', {
            chapter_code: chapterHash,
        });

        // Triple Lock System: 예측 가능한 ch1 대신 서버에서 받은 해시값으로 이동
        navigate(`/play/${chapterHash}`);
    };

    return { selectChapter };
};
