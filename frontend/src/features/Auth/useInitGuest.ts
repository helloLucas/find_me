import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { tokenManager } from '../../shared/utils/tokenManager';
import type { BaseResponse } from '../../shared/types/api';

/**
 * TokenResponse 인터페이스
 * 백엔드 /api/v1/auth/guest-init API의 응답 형식을 정의합니다.
 */
export interface TokenResponse {
    accessToken: string;
    refreshToken: string;
    userId: number;
    role: string;
    nickname: string;
    isNewUser: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * useInitGuest (Hook)
 * 
 * 게스트 로그인을 위해 백엔드 API를 호출하여 토큰을 발급받습니다.
 * 발급받은 토큰은 AuthStorage(tokenManager)를 통해 저장되며, 
 * 이후 닉네임 설정 페이지로 리다이렉트됩니다.
 */
export const useInitGuest = () => {
    const navigate = useNavigate();

    return useMutation({
        // 401 Interceptor에 영향을 받지 않기 위해 기본 axios 인스턴스 사용
        mutationFn: async () => {
            const response = await axios.get<BaseResponse<TokenResponse>>(
                `${API_BASE_URL}/api/v1/auth/guest-init`,
                { withCredentials: true }
            );
            return response.data.data;
        },
        onSuccess: (data) => {
            // 1. 발급받은 JWT 토큰 저장
            tokenManager.setAccessToken(data.accessToken);

            // 2. 신규 유저와 마찬가지로 닉네임 설정 페이지로 이동
            navigate('/setup-nickname', { replace: true });
        },
        onError: (error: any) => {
            console.error('Guest initialization failed:', error);
            
            // 사이버펑크 스타일의 에러 통지 (단순 alert -> 추후 custom toast 반영 권장)
            alert('>> CRITICAL ERROR: GUEST PROTOCOL INITIALIZATION FAILED.\n>> REASON: REMOTE CONNECTION TERMINATED.');
        }
    });
};
