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
    initGuest();
  };

  /**
   * LOGOUT 핸들러
   */
  const handleLogout = () => {
    clearAuth();
    navigate('/', { replace: true });
  };

  return {
    handleSystemAccess,
    handleGuestAccess,
    handleLogout,
    isGuestInitializing,
  };
};
