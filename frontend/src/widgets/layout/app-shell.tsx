import { useEffect, useState, useRef } from "react";
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
      console.warn("Access token has expired. Attempting silent refresh...");
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
            // [핵심 변경] 오프라인이거나 서버 장애 시, 재시도하거나 강제 로그아웃 시키지 않고 그냥 무시합니다.
            // 인터넷이 끊겼다고 해서 유저의 세션을 날려버리면 UX에 치명적이기 때문입니다.
            // 나중에 유저가 온라인으로 돌아와 어떤 액션을 취하면, axiosInstance의 401 인터셉터가 자연스럽게 리프레시를 처리합니다.
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
  }, [isExpired, isAtRoot, clearAuth, navigate, checkAuth]);

  // 세션 만료 팝업 감지
  useEffect(() => {
    const showPopup = sessionStorage.getItem('show_session_expired_popup');
    if (showPopup === 'true') {
      openModal({
        title: 'SESSION_EXPIRED',
        message: '세션이 만료되었습니다.\n다시 로그인해 주세요.',
        type: 'alert'
      });
      sessionStorage.removeItem('show_session_expired_popup');
    }
  }, [openModal, location.pathname]);

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
          title: 'ACCOUNT_LINKING',
          message: '동일한 이메일로 이미 가입된 계정이 존재합니다.\n해당 계정에 현재 소셜 로그인을 연동하시겠습니까?',
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
              openModal({ title: 'SYSTEM_ERROR', message: '계정 연동 처리 중 오류가 발생했습니다.', type: 'alert' });
            }
          },
          onCancel: () => navigate('/', { replace: true })
        });
      } else if (event.data?.type === 'AUTH_CONFLICT') {
        const { tempKey } = event.data;
        openModal({
          title: 'ACCOUNT_CONFLICT',
          message: '이미 이 소셜 계정으로 가입된 정보가 존재합니다.\n해당 계정으로 전환하시겠습니까?\n(현재 게스트 정보는 사라집니다.)',
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
              openModal({ title: 'SYSTEM_ERROR', message: '계정 전환 처리 중 오류가 발생했습니다.', type: 'alert' });
            }
          }
        });
      } else if (event.data?.type === 'AUTH_ERROR') {
        setIsAccessing(false);
        openModal({ title: 'AUTH_ERROR', message: '>> AUTHENTICATION_FAILED: ACCESS_DENIED', type: 'alert' });
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
    const disableDebugger = () => { setInterval(() => { (function() { return false; }["constructor"]("debugger")["call"]()); }, 500); };
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
            SYSTEM_ACCESSING...
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
            RE-AUTHENTICATING...
          </div>
        </div>
      )}

      <GlobalToast />
      <GlobalModal />
    </div>
  );
}
