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
    confirmSwitch?: boolean;
    /** 동일 이메일 계정 연동(Account Linking) 확인 여부 */
    confirmAccountLinking?: boolean;
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
            const newAccessToken = response.data?.accessToken;

            // 1. 토큰 및 전역 상태 업데이트
            if (newAccessToken) {
                tokenManager.setAccessToken(newAccessToken);
                useAuthStore.getState().setAuth(newAccessToken);
                // 닉네임 정보가 있다면 터미널 컨텍스트도 업데이트
                if (variables.nickname) {
                    setTerminalContext(variables.nickname);
                }
            }

            // 2. 팝업 창인 경우: 부모 창으로 성공 메시지 전송 후 닫기
            if (window.opener) {
                window.opener.postMessage({
                    type: 'AUTH_SUCCESS',
                    accessToken: newAccessToken,
                    isNewUser: false // 이미 등록 절차를 마쳤으므로 false
                }, window.location.origin);
                window.close();
                return;
            }

            // 3. 단독 페이지인 경우: 접속 오버레이 표시 후 로비로 이동
            setIsAccessing(true);
            setTimeout(() => {
                setIsAccessing(false);
                navigate('/lobby', { replace: true });
            }, 1000);
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
