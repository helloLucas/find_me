import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { useAuthStore } from "../../app/store/authStore";
import { useClientStore } from "../../app/store/clientStore";
import { tokenManager } from "../../shared/utils/tokenManager";
import { useModalStore } from "../../app/store/modalStore";
import { GlobalModal } from "../GlobalModal";

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
      } else if (event.data?.type === 'AUTH_CONFLICT') {
        const { tempKey } = event.data;
        openModal({
          title: 'ACCOUNT_CONFLICT',
          message: '이미 이 소셜 계정으로 가입된 정보가 존재합니다.\n해당 계정으로 전환하시겠습니까?\n(현재 게스트 정보는 사라집니다.)',
          type: 'confirm',
          onConfirm: () => {
             // 닉네임 업데이트 훅을 통해 전환 처리 (AppShell 상위에서 mutate를 쓸 수 있게 함)
             // 실제로는 useNavigate나 별도 이벤트를 통해 처리할 수도 있지만,
             // 여기서는 /setup-nickname으로 보내되 confirmSwitch 플래그를 실어 보낼 수도 있습니다.
             // 혹은 AppShell에서 직접 register API를 호출하도록 유도합니다.
             navigate('/setup-nickname', {
                replace: true,
                state: { tempKey, confirmSwitch: true }
             });
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
  }, [checkAuth, navigate]);

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
          <div className="font-pixel text-[#a3e635] text-2xl animate-pulse tracking-[0.5em]">
            SYSTEM_ACCESSING...
          </div>
          <div className="mt-4 w-48 h-1 bg-gray-900 overflow-hidden">
            <div className="h-full bg-[#a3e635] animate-[shimmer_2s_infinite]" />
          </div>
        </div>
      )}

      {children}
      <GlobalModal />
    </div>
  );
}
