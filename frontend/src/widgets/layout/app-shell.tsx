import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { useAuthStore } from "../../app/store/authStore";
import { useClientStore } from "../../app/store/clientStore";
import { tokenManager } from "../../shared/utils/tokenManager";
import { useModalStore } from "../../app/store/modalStore";
import { GlobalModal } from "../GlobalModal";
import { GlobalToast } from "../GlobalToast";

export default function AppShell({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const openModal = useModalStore((state) => state.openModal);
  const { isAccessing, setIsAccessing } = useClientStore();

  // 세션 만료 팝업 감지 (axiosInstance에서 보낸 신호)
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
  }, [openModal]);

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
              const axiosModule = await import('../../shared/api/axiosInstance');
              const tokenManagerModule = await import('../../shared/utils/tokenManager');
              const authStoreModule = await import('../../app/store/authStore');
              const clientStoreModule = await import('../../app/store/clientStore');

              const response = await axiosModule.default.post('/api/v1/users/register', {
                tempKey,
                nickname: '',
                confirmAccountLinking: true,
              });

              const newAccessToken = response.data?.data?.accessToken;
              if (newAccessToken) {
                tokenManagerModule.tokenManager.setAccessToken(newAccessToken);
                authStoreModule.useAuthStore.getState().setAuth(newAccessToken);
              }

              clientStoreModule.useClientStore.getState().setIsAccessing(true);
              setTimeout(() => {
                clientStoreModule.useClientStore.getState().setIsAccessing(false);
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
              const axiosModule = await import('../../shared/api/axiosInstance');
              const tokenManagerModule = await import('../../shared/utils/tokenManager');
              const authStoreModule = await import('../../app/store/authStore');
              const clientStoreModule = await import('../../app/store/clientStore');

              const response = await axiosModule.default.post('/api/v1/users/register', {
                tempKey,
                nickname: '',
                confirmSwitch: true,
              });

              const newAccessToken = response.data?.data?.accessToken;
              if (newAccessToken) {
                tokenManagerModule.tokenManager.setAccessToken(newAccessToken);
                authStoreModule.useAuthStore.getState().setAuth(newAccessToken);
              }

              clientStoreModule.useClientStore.getState().setIsAccessing(true);
              setTimeout(() => {
                clientStoreModule.useClientStore.getState().setIsAccessing(false);
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

      {children}
      <GlobalToast />
      <GlobalModal />
    </div>
  );
}
