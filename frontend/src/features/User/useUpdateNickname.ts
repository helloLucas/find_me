import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import axiosInstance from '../../shared/api/axiosInstance';
import { tokenManager } from '../../shared/utils/tokenManager';
import type { BaseResponse } from '../../shared/types/api';
import { useClientStore } from '../../app/store/clientStore';
import { useAuthStore } from '../../app/store/authStore';

interface UpdateNicknameRequest {
    nickname: string;
}

/**
 * useUpdateNickname (Hook)
 *
 * 사용자 닉네임을 변경하는 API 호출을 관리합니다.
 * 성공 시 터미널 컨텍스트를 업데이트하고 로비로 이동합니다.
 */
export const useUpdateNickname = () => {
    const navigate = useNavigate();
    const setTerminalContext = useClientStore((state) => state.setTerminalContext);

    // 환경변수 또는 하드코딩된 API 주소
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

    return useMutation({
        mutationFn: async (data: UpdateNicknameRequest) => {
            const response = await axiosInstance.patch<BaseResponse<void>>('/api/v1/users/nickname', data);
            return response.data;
        },
        onSuccess: async (_, variables) => {
            // 1. 전역 상태 업데이트 (기존 유지)
            setTerminalContext(variables.nickname);
            useAuthStore.getState().setUserProfile({ nickname: variables.nickname });

            try {
                // 2. 닉네임이 바뀌었으므로 새 토큰을 발급받습니다
                const refreshRes = await axios.post<BaseResponse<{ accessToken: string }>>(
                    `${API_BASE_URL}/api/v1/auth/refresh`,
                    undefined,
                    { withCredentials: true }
                );

                const { accessToken } = refreshRes.data.data;
                tokenManager.setAccessToken(accessToken);
                useAuthStore.getState().checkAuth();
            } catch (error) {
                console.error('닉네임 변경 후 토큰 갱신에 실패했습니다:', error);
            }

            // 4. 로비로 이동
            navigate('/lobby', { replace: true });
        },
        onError: (error: any) => {
            console.error('닉네임 변경에 실패했습니다:', error);
            const detail = error.response?.data?.detail || '초기 닉네임 설정 중 오류가 발생했습니다.';
            alert(`오류: ${detail}`);
        },
    });
};
