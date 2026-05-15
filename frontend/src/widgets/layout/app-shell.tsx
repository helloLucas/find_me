import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { useAuthStore } from "../../app/store/authStore";
import { useClientStore } from "../../app/store/clientStore";
import { tokenManager } from "../../shared/utils/tokenManager";
import { openConnectionFailedModal, useModalStore } from "../../app/store/modalStore";
import { jwtDecode } from "jwt-decode";
import axiosInstance from '../../shared/api/axiosInstance';
import axios from 'axios';
import { useClipboardStore } from "../../app/store/clipboardStore";
import { isConnectionError } from "../../shared/api/apiError";

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

  // refreshLock: useRef로 관리. 리렌더링마다 동일한 mutable 객체를 참조하므로
  // isRefreshingUI 변경으로 인한 리렌더링이 발생해도 값이 초기화되지 않습니다.
  // 단, cleanup에서 절대 .current를 건드리지 않는 것이 이 패턴의 핵심 규칙입니다.
  const refreshLock = useRef(false);

  // 선제적 토큰 만료 여부 판별 (렌더링마다 최신 상태 계산)
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
  // refreshLock이 걸려있지 않을 때만 플래그를 세팅하여 중복 실행 방지
  if (isExpired && !refreshLock.current) {
    sessionStorage.setItem('is_silent_refreshing', 'true');
  }

  // 선제적 토큰 만료 감지 시 '조용한 자동 리프레시' 시도
  useEffect(() => {
    // refreshLock.current가 true인 동안은 이 블록에 절대 진입하지 않습니다.
    // isRefreshingUI 변경으로 리렌더링이 발생해도 중복 실행이 차단됩니다.
    if (!isExpired || refreshLock.current) return;

    console.warn(t("auth.accessTokenExpired"));

    // 동기적으로 즉시 락 획득 (await 이전, 어떤 비동기 컨텍스트 스위치도 없이)
    refreshLock.current = true;
    setIsRefreshingUI(!isAtRoot);

    const attemptRefresh = async () => {
      // 네트워크 에러 여부를 finally에서 판단하기 위한 플래그
      let isNetworkOrServerError = false;

      try {
        const cleanAxios = axios.create();
        const baseURL = import.meta.env.VITE_API_BASE_URL || '';
        const response = await cleanAxios.post(
          `${baseURL}/api/v1/auth/refresh`,
          undefined,
          { withCredentials: true }
        );

        const newAccessToken = response.data?.data?.accessToken;
        if (!newAccessToken) {
          // 응답은 성공했지만 토큰이 없는 경우 (비정상 응답)
          throw new Error('Silent refresh: no token in response body');
        }

        tokenManager.setAccessToken(newAccessToken);
        checkAuth(); // authStore 동기화

      } catch (error: any) {
        isNetworkOrServerError = isConnectionError(error);

        if (isNetworkOrServerError) {
          console.warn('Silent refresh failed due to network/server error.');
          openConnectionFailedModal();
        } else {
          // 4xx 에러: 리프레시 토큰 자체 만료 → 세션 완전 종료
          console.error('Silent refresh failed (Refresh Token expired):', error);
          clearAuth();
          if (isAtRoot) return;
          sessionStorage.setItem('show_session_expired_popup', 'true');
          navigate('/', { replace: true });
        }

      } finally {
        // [핵심] 성공/실패/예외 모든 경우에 finally에서 단 한 번만 락 해제
        // try/catch 각 분기에서 개별 해제하면 경쟁 조건 발생 가능성이 있습니다.
        // cleanup 함수에서는 이 값을 절대 건드리지 않습니다.
        refreshLock.current = false;
        setIsRefreshingUI(false);
        sessionStorage.removeItem('is_silent_refreshing');
      }
    };

    attemptRefresh();

    // [cleanup 규칙] refreshLock.current와 sessionStorage 플래그를 절대 건드리지 않습니다.
    // cleanup에서 이 값들을 초기화하면, setIsRefreshingUI(true)로 인한 리렌더링 시
    // React가 cleanup → re-effect 사이클을 돌면서 진행 중인 락이 풀려버리는
    // 경쟁 조건이 발생합니다. 모든 정리는 finally 블록이 책임집니다.
    return () => { /* intentionally empty: lock/flag cleanup is handled in finally */ };
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

  // 게임 내부 전용 복사(Copy) 이벤트 및 OS 교차 지원 단축키(Ctrl+C / Cmd+C) 감지 리스너
  useEffect(() => {
    const handleGlobalCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection()?.toString();
      if (selection) {
        useClipboardStore.getState().setClipboardText(selection);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCopyCombo = (e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C");
      if (isCopyCombo) {
        const selection = window.getSelection()?.toString();
        if (selection) {
          useClipboardStore.getState().setClipboardText(selection);
        }
      }
    };

    document.addEventListener("copy", handleGlobalCopy);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("copy", handleGlobalCopy);
      window.removeEventListener("keydown", handleKeyDown);
    };
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

    </div>
  );
}
