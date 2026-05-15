import { useMutation } from '@tanstack/react-query';
import { openConnectionFailedModal, useModalStore } from '../../app/store/modalStore';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import type { BaseResponse } from '../../shared/types/api';
import { isConnectionError } from '../../shared/api/apiError';
import { useConnectionStatusStore } from '../../app/store/connectionStatusStore';

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
      // [수정] env.apiBaseUrl을 제거하고 상대 경로를 사용하여 Vite Proxy를 타게 함
      const response = await axios.get<BaseResponse<{ tempKey: string }>>(
        `/api/v1/auth/guest-init`,
        { withCredentials: true }
      );

      // [추가] 응답이 비정상이거나 HTML(Nginx 에러 페이지 등)일 경우에 대한 방어 로직
      if (!response.data || typeof response.data === 'string') {
        console.error('>> INVALID API RESPONSE:', response.data);
        throw new Error('API Response is not JSON. Check Proxy/Network settings.');
      }

      return response.data.data;
    },
    onSuccess: (data) => {
      useConnectionStatusStore.getState().markOnline();

      // [리팩토링] 이제 게스트도 즉시 토큰을 받지 않고, 닉네임 입력 전까지 tempKey만 보유함
      // 닉네임 설정 페이지로 이동할 때 tempKey를 state로 전달
      navigate('/setup-nickname', {
        replace: true,
        state: { tempKey: data.tempKey }
      });
    },
    onError: (error: any) => {
      console.error('Guest initialization failed:', error);

      if (isConnectionError(error)) {
        useConnectionStatusStore.getState().markOffline();
        openConnectionFailedModal();
        return;
      }

      useModalStore.getState().openModal({
        title: 'CRITICAL_SYSTEM_ERROR',
        message: '>> CRITICAL ERROR: GUEST PROTOCOL INITIALIZATION FAILED.\n>> REASON: REMOTE CONNECTION TERMINATED.',
        type: 'alert'
      });
    }
  });
};
