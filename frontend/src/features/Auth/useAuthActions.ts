import { useNavigate } from 'react-router-dom';
import { useInitGuest } from './useInitGuest';
import { useAuthStore } from '../../app/store/authStore';

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
   */
  const handleSystemAccess = () => {
    window.location.href = GOOGLE_AUTH_URL;
  };

  /**
   * ANONYMOUS 진입 핸들러 (Guest)
   */
  const handleGuestAccess = () => {
    if (isGuestInitializing) return;

    const confirmGuest = window.confirm(
      '익명 접속 시 진행 상황이 저장되지 않을 수 있습니다.\n계속하시겠습니까?'
    );

    if (confirmGuest) {
      initGuest();
    }
  };

  /**
   * LOGOUT 핸들러
   */
  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
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
