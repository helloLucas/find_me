import { useNavigate } from 'react-router-dom';
import { useInitGuest } from './useInitGuest';
import { useAuthStore } from '../../app/store/authStore';
import { useClientStore } from '../../app/store/clientStore';
import { useStoryRuntimeStore } from '../story-runtime/storyRuntime.store';
import { useMessengerStore } from '../../app/store/messengerStore';
import { useLucasStore } from '../../app/store/lucasStore';
import { useBrowserContentStore } from '../../app/store/browserContentStore';
import { useWindowStore } from '../../app/store/windowStore';
import { tokenManager } from '../../shared/utils/tokenManager';
import { env } from '../../shared/config/env';

/**
 * 인증 관련 사용자 액션을 처리하는 커스텀 훅
 */
export const useAuthActions = () => {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const resetClientStore = useClientStore((state) => state.resetClientStore);
  const resetStoryRuntime = useStoryRuntimeStore((state) => state.resetStoryRuntime);
  const resetMessenger = useMessengerStore((state) => state.resetMessenger);
  const resetLucas = useLucasStore((state) => state.resetLucas);
  const resetContent = useBrowserContentStore((state) => state.resetContent);
  const resetWindows = useWindowStore((state) => state.resetWindows);

  /**
   * OAuth 로그인 실행 핸들러 (Provider별 분기)
   * 전체화면 유지를 위해 팝업창 도구를 통해 소셜 로그인을 시도합니다.
   */
  const handleLoginWithProvider = (provider: 'google' | 'ssafy') => {
    const authUrl = `${env.apiBaseUrl}/oauth2/authorization/${provider}`;

    // SSAFY 로그인 폼의 우측 내용이 잘리지 않는 최적의 사이즈
    const width = 650;
    const height = 700;

    const screenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const screenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

    const left = screenLeft + (window.outerWidth - width) / 2;
    const top = screenTop + (window.outerHeight - height) / 2;

    const features = `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no,resizable=yes,scrollbars=yes`;

    const popup = window.open(authUrl, `${provider}Login`, features);

    if (popup) popup.focus();
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

    // 2. 전역 상태 즉시 초기화 및 화면 전환 (낙관적 UI 업데이트)
    clearAuth();
    resetClientStore();
    resetStoryRuntime();
    resetMessenger();
    resetLucas();
    resetContent();
    resetWindows();
    
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
