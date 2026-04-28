import { useEffect } from 'react';
import { useAuthStore } from '../../app/store/authStore';

/**
 * SessionMode 타입 정의
 * USER_MODE: 소셜 로그인 완료 회원 (MEMBER)
 * GUEST_MODE: 게스트 접속 유저 (GUEST)
 */
export type SessionMode = 'USER_MODE' | 'GUEST_MODE';

/**
 * useAuthStatus (Hook)
 *
 * 전역 인증 스토어(Zustand)와 연동하여 유저의 현재 인증 상태를 반환합니다.
 * 스토어 상태 변경 시 즉각적으로 반응(Reactive)합니다.
 */
export const useAuthStatus = () => {
    const { nickname, role, isInitialized, checkAuth } = useAuthStore();

    useEffect(() => {
        // 컴포넌트 마운트 시 최신 상태 확인
        checkAuth();
    }, [checkAuth]);

    const sessionMode: SessionMode = role === 'MEMBER' ? 'USER_MODE' : 'GUEST_MODE';

    return {
        nickname,
        sessionMode,
        isGuest: sessionMode === 'GUEST_MODE',
        isMember: sessionMode === 'USER_MODE',
        isLoading: !isInitialized
    };
};
