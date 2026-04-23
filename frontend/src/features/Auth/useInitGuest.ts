import { useMutation } from '@tanstack/react-query';
import { useModalStore } from '../../app/store/modalStore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { tokenManager } from '../../shared/utils/tokenManager';
import { useAuthStore } from '../../app/store/authStore';
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
            const response = await axios.get<BaseResponse<{ tempKey: string }>>(
                `${API_BASE_URL}/api/v1/auth/guest-init`,
                { withCredentials: true }
            );
            return response.data.data;
        },
        onSuccess: (data) => {
            // [리팩토링] 이제 게스트도 즉시 토큰을 받지 않고, 닉네임 입력 전까지 tempKey만 보유함
            // 닉네임 설정 페이지로 이동할 때 tempKey를 state로 전달
            navigate('/setup-nickname', { 
                replace: true, 
                state: { tempKey: data.tempKey } 
            });
        },
        onError: (error: any) => {
            console.error('Guest initialization failed:', error);
            
            useModalStore.getState().openModal({
                title: 'CRITICAL_SYSTEM_ERROR',
                message: '>> CRITICAL ERROR: GUEST PROTOCOL INITIALIZATION FAILED.\n>> REASON: REMOTE CONNECTION TERMINATED.',
                type: 'alert'
            });
        }
    });
};
