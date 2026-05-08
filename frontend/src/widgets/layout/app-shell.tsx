import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { useAuthStore } from "../../app/store/authStore";
import { useClientStore } from "../../app/store/clientStore";
import { tokenManager } from "../../shared/utils/tokenManager";
import { useModalStore } from "../../app/store/modalStore";
import { GlobalModal } from "../GlobalModal";
import { GlobalToast } from "../GlobalToast";
import { jwtDecode } from "jwt-decode";
import axiosInstance from '../../shared/api/axiosInstance';
import axios from 'axios';

export default function AppShell({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const openModal = useModalStore((state) => state.openModal);
  const { isAccessing, setIsAccessing } = useClientStore();

  const isAtRoot = location.pathname === "/";

  const [isRefreshingUI, setIsRefreshingUI] = useState(false);
  const refreshLock = useRef(false);

  // 선제적 토큰 만료 여부 판별
  const isExpired = (() => {
    const accessToken = tokenManager.getAccessToken();
    if (!accessToken) return false;
    try {
      const decoded: any = jwtDecode(accessToken);
      return !!(decoded && decoded.exp && decoded.exp * 1000 < Date.now() + 5000); // 5초 오차 마진
    } catch {
      return true;
    }
  })();

  // [중요] 자식 컴포넌트의 useEffect보다 먼저 실행되도록 렌더링 단계에서 동기적으로 플래그 설정
  if (isExpired && !isAtRoot && !refreshLock.current) {
    sessionStorage.setItem('is_silent_refreshing', 'true');
  }

  // 선제적 토큰 만료 감지 시 '조용한 자동 리프레시' 시도
  useEffect(() => {
    let isMounted = true;

    if (isExpired && !isAtRoot && !refreshLock.current) {
      console.warn(t("auth.accessTokenExpired"));
      refreshLock.current = true;
      setIsRefreshingUI(true);

      const attemptRefresh = async () => {
        try {
          const cleanAxios = axios.create();
          const baseURL = import.meta.env.VITE_API_BASE_URL || '';
          const response = await cleanAxios.post(`${baseURL}/api/v1/auth/refresh`, undefined, { withCredentials: true });

          const newAccessToken = response.data?.data?.accessToken;

          if (newAccessToken && isMounted) {
            tokenManager.setAccessToken(newAccessToken);
            checkAuth(); // authStore 갱신
            refreshLock.current = false;
            setIsRefreshingUI(false);
            sessionStorage.removeItem('is_silent_refreshing');
          }
        } catch (error: any) {
          // 네트워크 에러이거나 500번대 서버 에러인 경우
          const isNetworkOrServerError = !error.response || error.response.status >= 500;

          if (isNetworkOrServerError) {
            console.warn("Silent refresh paused due to network/server issue. Will wait for active user request.");
            if (isMounted) {
              refreshLock.current = false;
              setIsRefreshingUI(false);
              sessionStorage.removeItem('is_silent_refreshing');
            }
            return;
          }

          // 리프레시 토큰 자체도 만료되었거나 변조된 경우 (4xx 에러)
          console.error("Silent refresh finally failed (Refresh Token Expired):", error);
          if (isMounted) {
            clearAuth();
            sessionStorage.setItem('show_session_expired_popup', 'true');
            sessionStorage.removeItem('is_silent_refreshing');
            navigate("/", { replace: true });
            refreshLock.current = false;
            setIsRefreshingUI(false);
          }
        }
      };

      attemptRefresh();
    }
    return () => {
      isMounted = false;
      refreshLock.current = false;
      sessionStorage.removeItem('is_silent_refreshing');
    };
  }, [isExpired, isAtRoot, clearAuth, navigate, checkAuth, t]);

  // 세션 만료 팝업 감지
  useEffect(() => {
    const showPopup = sessionStorage.getItem('show_session_expired_popup');
    if (showPopup === 'true') {
      openModal({
        title: t('auth.sessionExpiredTitle'),
        message: t('auth.sessionExpiredMsg'),
        type: 'alert'
      });
      sessionStorage.removeItem('show_session_expired_popup');
    }
  }, [openModal, location.pathname, t]);

  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'AUTH_SUCCESS') {
        const { isNewUser, accessToken } = event.data;
        if (accessToken) tokenManager.setAccessToken(accessToken);
        checkAuth();
        if (isNewUser) {
          navigate('/setup-nickname', { replace: true });
        } else {
          setIsAccessing(true);
          setTimeout(() => {
            setIsAccessing(false);
            navigate('/lobby', { replace: true });
          }, 1500);
        }
      } else if (event.data?.type === 'AUTH_PENDING_REGISTRATION') {
        const { tempKey, guestId } = event.data;
        navigate('/setup-nickname', {
          replace: true,
          state: { tempKey, guestId }
        });
      } else if (event.data?.type === 'AUTH_ACCOUNT_LINKING') {
        const { tempKey } = event.data;
        openModal({
          title: t('auth.accountLinkingTitle'),
          message: t('auth.accountLinkingMsg'),
          type: 'confirm',
          onConfirm: async () => {
            try {
              const response = await axiosInstance.post('/api/v1/users/register', { tempKey, nickname: '', confirmAccountLinking: true });
              const newAccessToken = response.data?.data?.accessToken;
              if (newAccessToken) {
                tokenManager.setAccessToken(newAccessToken);
                useAuthStore.getState().setAuth(newAccessToken);
              }
              useClientStore.getState().setIsAccessing(true);
              setTimeout(() => {
                useClientStore.getState().setIsAccessing(false);
                navigate('/lobby', { replace: true });
              }, 1000);
            } catch (err: any) {
              if (err.response?.data?.code === 'E1002') return;
              openModal({
                title: t('common.systemError'),
                message: t('auth.accountLinkingFailed'),
                type: 'alert',
              });
            }
          },
          onCancel: () => navigate('/', { replace: true })
        });
      } else if (event.data?.type === 'AUTH_CONFLICT') {
        const { tempKey } = event.data;
        openModal({
          title: t('auth.accountConflictTitle'),
          message: t('auth.accountConflictMsg'),
          type: 'confirm',
          onConfirm: async () => {
            try {
              const response = await axiosInstance.post('/api/v1/users/register', { tempKey, nickname: '', confirmSwitch: true });
              const newAccessToken = response.data?.data?.accessToken;
              if (newAccessToken) {
                tokenManager.setAccessToken(newAccessToken);
                useAuthStore.getState().setAuth(newAccessToken);
              }
              useClientStore.getState().setIsAccessing(true);
              setTimeout(() => {
                useClientStore.getState().setIsAccessing(false);
                navigate('/lobby', { replace: true });
              }, 1000);
            } catch (err: any) {
              if (err.response?.data?.code === 'E1002') return;
              openModal({
                title: t('common.systemError'),
                message: t('auth.accountSwitchFailed'),
                type: 'alert',
              });
            }
          }
        });
      } else if (event.data?.type === 'AUTH_ERROR') {
        setIsAccessing(false);
        openModal({
          title: t('auth.authErrorTitle'),
          message: t('auth.authErrorMsg'),
          type: 'alert'
        });
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [checkAuth, navigate, openModal, setIsAccessing]);

  useEffect(() => {
    if (import.meta.env.VITE_DEV_MODE === "true") return;
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  useEffect(() => {
    if (import.meta.env.VITE_DEV_MODE === "true") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'i' || e.key === 'j' || e.key === 'c')) || (e.ctrlKey && (e.key === 'U' || e.key === 'u'))) {
        e.preventDefault();
        return false;
      }
    };
    const disableDebugger = () => { setInterval(() => { (function () { return false; }["constructor"]("debugger")["call"]()); }, 500); };
    window.addEventListener('keydown', handleKeyDown);
    disableDebugger();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white relative">

      {/* SYSTEM ACCESS OVERLAY */}
      {isAccessing && (
        <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="font-system-overlay text-[#a3e635] text-2xl animate-pulse tracking-[0.5em]">
            {t('common.accessing')}
          </div>
          <div className="mt-4 w-48 h-1 bg-gray-900 overflow-hidden">
            <div className="h-full bg-[#a3e635] animate-[shimmer_2s_infinite]" />
          </div>
        </div>
      )}

      {/* children을 조건부 언마운트하지 않고 항상 렌더링 유지 */}
      {children}

      {/* RE-AUTHENTICATING OVERLAY: 기존 화면 위에 덮어씌움 (backdrop-blur 추가) */}
      {isRefreshingUI && (
        <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto">
          <div className="font-system-overlay text-[#a3e635] text-lg animate-pulse tracking-widest">
            {t('common.reauthenticating')}
          </div>
        </div>
      )}

      <GlobalToast />
      <GlobalModal />
    </div>
  );
}
