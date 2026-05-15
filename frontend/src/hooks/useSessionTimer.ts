import { useEffect, useRef } from 'react';
import { useAuthStore } from '../app/store/authStore';
import { tokenManager } from '../shared/utils/tokenManager';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { isConnectionError } from '../shared/api/apiError';
import { openConnectionFailedModal } from '../app/store/modalStore';

export function useSessionTimer() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const MAX_SESSION_TIME = 24 * 60 * 60 * 1000; // 24시간

    // const INTERVAL_MS = 10 * 1000;  // 검사 주기: 10초 (테스트용)
    // const EXPIRATION_MARGIN_MS = 30 * 1000; // // 갱신 마진: 30초 (테스트용)
    const INTERVAL_MS = 60 * 1000; // 검사 주기: 1분
    const EXPIRATION_MARGIN_MS = 5 * 60 * 1000; // 갱신 마진: 5분

    const checkTokenAndRefresh = async () => {
      // 방어 로직 2: 최대 접속 제한 확인
      if (Date.now() - mountTimeRef.current > MAX_SESSION_TIME) {
        console.warn('Max session time exceeded. Terminating session.');
        clearAuth();
        sessionStorage.setItem('show_session_expired_popup', 'true');
        window.location.href = '/';
        return;
      }

      const accessToken = tokenManager.getAccessToken();
      if (!accessToken) return;

      let isExpired = false;
      try {
        const decoded: any = jwtDecode(accessToken);
        // 💡 300000(5분) 대신 분리해둔 상수를 사용합니다.
        isExpired = !!(decoded && decoded.exp && decoded.exp * 1000 < Date.now() + EXPIRATION_MARGIN_MS);
      } catch {
        isExpired = true;
      }

      if (isExpired) {
        sessionStorage.setItem('is_silent_refreshing', 'true');
        try {
          const cleanAxios = axios.create();
          const baseURL = import.meta.env.VITE_API_BASE_URL || '';
          const response = await cleanAxios.post(
            `${baseURL}/api/v1/auth/refresh`,
            undefined,
            { withCredentials: true }
          );

          const newAccessToken = response.data?.data?.accessToken;
          if (newAccessToken) {
            tokenManager.setAccessToken(newAccessToken);
            checkAuth();
            const { useConnectionStatusStore } = await import("../app/store/connectionStatusStore");
            useConnectionStatusStore.getState().markOnline();
          }
        } catch (error: any) {
          if (isConnectionError(error)) {
            console.warn('Silent refresh failed due to network/server error.');
            const { useConnectionStatusStore } = await import("../app/store/connectionStatusStore");
            useConnectionStatusStore.getState().markOffline();
            openConnectionFailedModal();
          } else {
            console.error('Silent refresh failed (Refresh Token expired):', error);
            clearAuth();
            if (window.location.pathname !== '/') {
              sessionStorage.setItem('show_session_expired_popup', 'true');
              window.location.href = '/';
            }
          }
        } finally {
          sessionStorage.removeItem('is_silent_refreshing');
        }
      }
    };

    // 🚀 [핵심 수정] 앱 실행(또는 페이지 마운트) 시 1분을 기다리지 않고 즉시 1회 검사 수행!
    checkTokenAndRefresh();

    // 이후 1분(60,000ms)마다 실행
    const intervalId = setInterval(checkTokenAndRefresh, INTERVAL_MS);

    // 컴포넌트 언마운트 시 클린업
    return () => clearInterval(intervalId);
  }, [checkAuth, clearAuth]);
}
