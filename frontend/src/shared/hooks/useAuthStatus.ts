import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { tokenManager } from '../utils/tokenManager';
import { userApi } from '../api/userApi';

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
        let isMounted = true;

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

                userApi.getMe()
                    .then((user) => {
                        if (!isMounted) return;
                        setNickname(user.nickname || decoded.nickname || 'UNKNOWN_AGENT');
                        setSessionMode(user.role === 'MEMBER' ? 'USER_MODE' : 'GUEST_MODE');
                    })
                    .catch((error) => {
                        console.error('현재 사용자 프로필 동기화에 실패했습니다:', error);
                    })
                    .finally(() => {
                        if (isMounted) {
                            setIsLoading(false);
                        }
                    });

                return () => {
                    isMounted = false;
                };
            } catch (error) {
                console.error('유효하지 않은 토큰을 감지했습니다:', error);
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

        return () => {
            isMounted = false;
        };
    }, []);

    return { 
        nickname, 
        sessionMode, 
        isGuest: sessionMode === 'GUEST_MODE',
        isMember: sessionMode === 'USER_MODE',
        isLoading 
    };
};
