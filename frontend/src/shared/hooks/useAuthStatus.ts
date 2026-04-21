import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { tokenManager } from '../utils/tokenManager';

/**
 * SessionMode 타입 정의
 * USER_MODE: 소셜 로그인 완료 회원 (MEMBER)
 * GUEST_MODE: 게스트 접속 유저 (GUEST)
 */
export type SessionMode = 'USER_MODE' | 'GUEST_MODE';

interface JwtPayload {
    role: 'GUEST' | 'MEMBER';
    nickname: string;
    exp: number;
}

/**
 * useAuthStatus (Hook)
 * 
 * 브라우저에 저장된 JWT 토큰을 분석하여 유저의 현재 인증 상태를 반환합니다.
 * 토큰 Claims에서 닉네임과 권한(MEMBER/GUEST)을 추출합니다.
 */
export const useAuthStatus = () => {
    const [nickname, setNickname] = useState<string>('ANONYMOUS');
    const [sessionMode, setSessionMode] = useState<SessionMode>('GUEST_MODE');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const accessToken = tokenManager.getAccessToken();

        if (accessToken) {
            try {
                // JWT 토큰 디코딩
                const decoded = jwtDecode<JwtPayload>(accessToken);
                
                // 닉네임 상태 동기화
                setNickname(decoded.nickname || 'UNKNOWN_AGENT');

                // Role에 따른 세션 모드 설정
                if (decoded.role === 'MEMBER') {
                    setSessionMode('USER_MODE');
                } else {
                    setSessionMode('GUEST_MODE');
                }
            } catch (error) {
                console.error('Invalid token detected:', error);
                // 토큰이 손상되었을 경우 초기화
                tokenManager.clearTokens();
                setNickname('ANONYMOUS');
                setSessionMode('GUEST_MODE');
            }
        } else {
            // 토큰이 없을 경우 기본값 유지
            setNickname('ANONYMOUS');
            setSessionMode('GUEST_MODE');
        }
        
        setIsLoading(false);
    }, []);

    return { 
        nickname, 
        sessionMode, 
        isGuest: sessionMode === 'GUEST_MODE',
        isMember: sessionMode === 'USER_MODE',
        isLoading 
    };
};
