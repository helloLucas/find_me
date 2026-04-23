import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../shared/api/axiosInstance';
import { tokenManager } from '../../shared/utils/tokenManager';
import type { BaseResponse } from '../../shared/types/api';
import { useClientStore } from '../../app/store/clientStore';
import { useAuthStore } from '../../app/store/authStore';
import { useModalStore } from '../../app/store/modalStore';

interface UpdateNicknameRequest {
    nickname: string;
    tempKey?: string;
    guestId?: number | null;
}

/**
 * useUpdateNickname (Hook)
 *
 * 사용자 닉네임을 변경하거나 신규 가입을 완료하는 API 호출을 관리합니다.
 * 성공 시 터미널 컨텍스트를 업데이트하고 로비로 이동합니다.
 */
export const useUpdateNickname = () => {
    const navigate = useNavigate();
    const setTerminalContext = useClientStore((state) => state.setTerminalContext);

    return useMutation({
        mutationFn: async (data: UpdateNicknameRequest) => {
            // tempKey가 있으면 신규 가입(POST /register), 없으면 닉네임 수정(PATCH /nickname)
            if (data.tempKey) {
                const response = await axiosInstance.post<BaseResponse<{ accessToken: string }>>('/api/v1/users/register', data);
                return response.data;
            } else {
                const response = await axiosInstance.patch<BaseResponse<{ accessToken: string }>>('/api/v1/users/nickname', data);
                return response.data;
            }
        },
        onSuccess: async (response, variables) => {
            const setIsAccessing = useClientStore.getState().setIsAccessing;

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

            // 3. 접속 오버레이 표시 후 로비로 이동
            setIsAccessing(true);
            setTimeout(() => {
                setIsAccessing(false);
                navigate('/lobby', { replace: true });
            }, 1500);
        },
        onError: (error: any) => {
            console.error('Failed to update nickname:', error);
            const detail = error.response?.data?.detail || '초기 닉네임 설정 중 오류가 발생했습니다.';
            useModalStore.getState().openModal({
                title: 'SYSTEM_ERROR',
                message: `Error: ${detail}`,
                type: 'alert'
            });
        },
    });
};
