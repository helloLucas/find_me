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
            const response = await axiosInstance.patch<BaseResponse<{ accessToken: string }>>('/api/v1/users/nickname', data);
            return response.data;
        },
        onSuccess: async (response, variables) => {
            // 1. 터미널 컨텍스트 업데이트
            setTerminalContext(variables.nickname);

            // 2. 서버에서 보내준 새 토큰 (새 닉네임 포함) 적용
            const newAccessToken = response.data?.accessToken;
            if (newAccessToken) {
                // 토큰 저장
                tokenManager.setAccessToken(newAccessToken);
                // 전역 스토어 업데이트 (Reactivity 확보)
                useAuthStore.getState().setAuth(newAccessToken);
            }

            // 3. 로비로 이동
            navigate('/lobby', { replace: true });
        },
        onError: (error: any) => {
            console.error('Failed to update nickname:', error);
            const detail = error.response?.data?.detail || '초기 닉네임 설정 중 오류가 발생했습니다.';
            alert(`Error: ${detail}`);
        },
    });
};
