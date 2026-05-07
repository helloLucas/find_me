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

  // 선제적 토큰 만료 여부 판별 (백엔드 API 호출 사전 차단용)
  const isExpired = (() => {
    const accessToken = tokenManager.getAccessToken();
    if (!accessToken) return false;
    try {
      const decoded: any = jwtDecode(accessToken);
      return !!(decoded && decoded.exp && decoded.exp * 1000 < Date.now() + 5000); // 5초 오차 마진
    } catch {
      return true; // 디코딩 오류 시 유효하지 않은 토큰으로 간주하여 만료 처리
    }
  })();

  // 선제적 토큰 만료 감지 시 '조용한 자동 리프레시(Silent Refresh)' 시도
  useEffect(() => {
    let isMounted = true;
    if (isExpired && !isAtRoot && !refreshLock.current) {
      console.warn("Access token has expired. Attempting silent refresh...");
      refreshLock.current = true;
      setIsRefreshingUI(true);
      
      const attemptRefresh = async () => {
        try {
          const response = await axiosInstance.post('/api/v1/auth/refresh', undefined, { withCredentials: true });
          const newAccessToken = response.data?.data?.accessToken;
          
          if (newAccessToken && isMounted) {
            tokenManager.setAccessToken(newAccessToken);
            checkAuth(); // authStore 상태 갱신
          }
        } catch (error) {
          console.error("Silent refresh failed:", error);
          if (isMounted) {
            clearAuth();
            sessionStorage.setItem('show_session_expired_popup', 'true');
            navigate("/", { replace: true });
          }
        } finally {
          if (isMounted) {
            refreshLock.current = false;
            setIsRefreshingUI(false);
          }
        }
      };

      attemptRefresh();
    }
    return () => { isMounted = false; };
  }, [isExpired, isAtRoot, clearAuth, navigate, checkAuth]);

  // 토큰이 만료되었고 로그인 페이지가 아니면 자식 렌더링 차단 (백엔드 요청 선제 차단)
  const shouldRenderChildren = !(isExpired && !isAtRoot);

  // 세션 만료 팝업 감지 (axiosInstance 또는 Silent Refresh 실패 시그널)
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
      // 보안을 위해 같은 origin인지 확인
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'AUTH_SUCCESS') {
        const { isNewUser, accessToken } = event.data;

        if (accessToken) {
          tokenManager.setAccessToken(accessToken);
        }

        checkAuth();

        if (isNewUser) {
          // 신규 유저라면 오버레이 없이 즉시 닉네임 설정으로 이동
          navigate('/setup-nickname', { replace: true });
        } else {
          // 기존 회원이면 접속 오버레이를 보여준 후 로비로 이동
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
        // [계정 연동 확인] 동일 이메일로 이미 가입된 계정이 있는 경우
        const { tempKey } = event.data;
        openModal({
          title: 'ACCOUNT_LINKING',
          message: '동일한 이메일로 이미 가입된 계정이 존재합니다.\n해당 계정에 현재 소셜 로그인을 연동하시겠습니까?',
          type: 'confirm',
          onConfirm: async () => {
            try {
              const response = await axiosInstance.post('/api/v1/users/register', {
                tempKey,
                nickname: '',
                confirmAccountLinking: true,
              });

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
              console.error('Account linking failed:', err);
              // E1002(세션 만료)는 인터셉터에서 이미 팝업을 표시했으므로 중복 방지
              if (err.response?.data?.code === 'E1002') return;
              openModal({
                title: 'SYSTEM_ERROR',
                message: '계정 연동 처리 중 오류가 발생했습니다.',
                type: 'alert',
              });
            }
          },
          onCancel: () => {
            navigate('/', { replace: true });
          }
        });

      } else if (event.data?.type === 'AUTH_CONFLICT') {
        // [계정 전환 확인] 게스트로 접속 중 이미 가입된 소셜 계정 발견
        const { tempKey } = event.data;
        openModal({
          title: 'ACCOUNT_CONFLICT',
          message: '이미 이 소셜 계정으로 가입된 정보가 존재합니다.\n해당 계정으로 전환하시겠습니까?\n(현재 게스트 정보는 사라집니다.)',
          type: 'confirm',
          onConfirm: async () => {
            try {
              const response = await axiosInstance.post('/api/v1/users/register', {
                tempKey,
                nickname: '',
                confirmSwitch: true,
              });

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
              console.error('Account switch failed:', err);
              // E1002(세션 만료)는 인터셉터에서 이미 팝업을 표시했으므로 중복 방지
              if (err.response?.data?.code === 'E1002') return;
              openModal({
                title: 'SYSTEM_ERROR',
                message: '계정 전환 처리 중 오류가 발생했습니다.',
                type: 'alert',
              });
            }
          }
        });

      } else if (event.data?.type === 'AUTH_ERROR') {
        setIsAccessing(false);
        openModal({
          title: 'AUTH_ERROR',
          message: '>> AUTHENTICATION_FAILED: ACCESS_DENIED',
          type: 'alert'
        });
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [checkAuth, navigate, openModal, setIsAccessing]);

  // 우클릭 방지 (보안 및 몰입감 향상) - 운영 환경에서만 활성화
  useEffect(() => {
    if (import.meta.env.VITE_DEV_MODE === "true") return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // 개발자 도구 차단 (키보드 단축키 및 디버거 루프) - 운영 환경에서만 활성화
  useEffect(() => {
    if (import.meta.env.VITE_DEV_MODE === "true") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // F12, Ctrl+Shift+I/J/C, Ctrl+U 차단
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'i' || e.key === 'j' || e.key === 'c')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
      ) {
        e.preventDefault();
        return false;
      }
    };

    const disableDebugger = () => {
        // 디버거 루프: 개발자 도구가 열려 있으면 여기서 계속 멈춤
        setInterval(() => {
            (function() {
                return false;
            }
            ["constructor"]("debugger")
            ["call"]());
        }, 500);
    };

    window.addEventListener('keydown', handleKeyDown);
    disableDebugger();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
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

      {shouldRenderChildren && !isRefreshingUI ? children : (
        <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black">
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
