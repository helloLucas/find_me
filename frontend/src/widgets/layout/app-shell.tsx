import { useEffect, useState } from "react";
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
        // 신규 가입 대기 상태: 오버레이 없이 즉시 닉네임 설정으로 유도
        const { tempKey, guestId } = event.data;
        navigate('/setup-nickname', {
          replace: true,
          state: { tempKey, guestId }
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
