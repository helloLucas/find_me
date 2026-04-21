import { useNavigate } from 'react-router-dom';
import { useInitGuest } from './useInitGuest';
import { useAuthStore } from '../../app/store/authStore';
import axiosInstance from '../../shared/api/axiosInstance';

/**
 * 인증 관련 사용자 액션을 처리하는 커스텀 훅
 */
export const useAuthActions = () => {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const GOOGLE_AUTH_URL = `${API_BASE_URL}/oauth2/authorization/google`;

  const { mutate: initGuest, isPending: isGuestInitializing } = useInitGuest();

  /**
   * SYSTEM ACCESS 버튼 핸들러 (Login)
   * 전체화면 유지를 위해 팝업창 도구를 통해 구글 OAuth 로그인을 시도합니다.
   */
  const handleSystemAccess = () => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(
      GOOGLE_AUTH_URL,
      'VoidCityLogin',
      `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
    );
  };

  /**
   * ANONYMOUS 진입 핸들러 (Guest)
   */
  const handleGuestAccess = () => {
    if (isGuestInitializing) return;
    initGuest();
  };

  /**
   * LOGOUT 핸들러
   */
  const handleLogout = async () => {
    try {
      // 1. 서버 측 로그아웃 처리 (Redis 삭제 및 쿠키 무효화 요청)
      // axiosInstance를 통해 자동으로 Authorization 헤더와 쿠키 설정이 적용됩니다.
      await axiosInstance.post('/api/v1/auth/logout');
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      // 2. 서버 응답과 무관하게 클라이언트 상태는 소거 (UX)
      clearAuth();
      navigate('/', { replace: true });
    }
  };

  return {
    handleSystemAccess,
    handleGuestAccess,
    handleLogout,
    isGuestInitializing,
  };
};
