import { useNavigate } from 'react-router-dom';
import { useInitGuest } from './useInitGuest';
import { useAuthStore } from '../../app/store/authStore';
import { tokenManager } from '../../shared/utils/tokenManager';
import { env } from '../../shared/config/env';

/**
 * 인증 관련 사용자 액션을 처리하는 커스텀 훅
 */
export const useAuthActions = () => {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);


  /**
   * OAuth 로그인 실행 핸들러 (Provider별 분기)
   * 전체화면 유지를 위해 팝업창 도구를 통해 소셜 로그인을 시도합니다.
   */
  const handleLoginWithProvider = (provider: 'google' | 'ssafy') => {
    const authUrl = `${env.apiBaseUrl}/oauth2/authorization/${provider}`;

    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(
      authUrl,
      `${provider}Login`,
      `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
    );
  };

  const { mutate: initGuest, isPending: isGuestInitializing } = useInitGuest();

  /**
   * ANONYMOUS 진입 핸들러 (Guest)
   */
  const handleGuestAccess = () => {
    if (isGuestInitializing) return;
    initGuest();
  };

  /**
   * LOGOUT 핸들러
   * 백엔드의 로그아웃 API를 호출하여 세션을 종료하고 쿠키를 삭제합니다.
   */
  const handleLogout = () => {
    // 1. [핵심] 상태를 지우기 전에 통신에 필요한 Access Token을 변수에 미리 빼둡니다.
    const currentToken = tokenManager.getAccessToken();

    // 2. 로컬 상태 즉시 초기화 및 화면 전환 (낙관적 UI 업데이트)
    clearAuth();
    navigate('/', { replace: true });

    // 3. 백그라운드 세션 종료 요청 (확보해둔 토큰을 헤더에 강제 주입)
    import('../../shared/api/axiosInstance').then(({ default: axiosInstance }) => {
      axiosInstance.post('/api/v1/auth/logout', {}, {
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {}
      }).catch(error => {
        console.error('Logout API failed in background:', error);
      });
    });
  };

  return {
    handleLoginWithProvider,
    handleSystemAccess: () => handleLoginWithProvider('google'),
    handleGuestAccess,
    handleLogout,
    isGuestInitializing,
  };
};
