import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { useAuthStore } from "../../app/store/authStore";
import { tokenManager } from "../../shared/utils/tokenManager";
import { useModalStore } from "../../app/store/modalStore";
import { GlobalModal } from "../GlobalModal";

export default function AppShell({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const openModal = useModalStore((state) => state.openModal);
  const [isAccessing, setIsAccessing] = useState(false);

  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      // 보안을 위해 같은 origin인지 확인
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'AUTH_SUCCESS') {
        setIsAccessing(true);

        // 1. 전달받은 데이터 한 번에 구조 분해 할당 (refreshToken 제거)
        const { isNewUser, accessToken } = event.data;

        // 1. 전달받은 토큰을 로컬에 안전하게 저장 (URL 노출 방지)
        if (accessToken) {
            tokenManager.setAccessToken(accessToken);
        }

        // 2. Zustand 스토어 인증 상태 동기화
        checkAuth();

        // 3. 우선순위에 따른 라우팅 (UX 몰입도)
        setTimeout(() => {
          setIsAccessing(false);

          if (isNewUser) {
            // 완전 신규 가입자: 닉네임 설정이 필요함
            navigate('/setup-nickname', { replace: true });
          } else {
            // 기존 회원 혹은 게스트 전환자 (이미 닉네임이 있음)
            navigate('/lobby', { replace: true });
          }
        }, 1500);
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
    if (!import.meta.env.PROD) return;

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
    if (!import.meta.env.PROD) return;

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
