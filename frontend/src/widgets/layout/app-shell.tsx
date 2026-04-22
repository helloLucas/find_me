import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { useAuthStore } from "../../app/store/authStore";
import { tokenManager } from "../../shared/utils/tokenManager";

export default function AppShell({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const [isAccessing, setIsAccessing] = useState(false);

  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      // 보안을 위해 같은 origin인지 확인
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'AUTH_SUCCESS') {
        setIsAccessing(true);
        const { isNewUser, accessToken } = event.data;
        
        // 1. 전달받은 토큰을 로컬에 안전하게 저장 (URL 노출 방지)
        if (accessToken) {
            tokenManager.setAccessToken(accessToken);
        }

        // 2. Zustand 스토어 인증 상태 동기화
        checkAuth();
        
        // 2. 약간의 지연 후 라우팅 (UX 몰입도)
        setTimeout(() => {
          setIsAccessing(false);
          if (isNewUser) {
            navigate('/setup-nickname', { replace: true });
          } else {
            navigate('/lobby', { replace: true });
          }
        }, 1500);
      } else if (event.data?.type === 'AUTH_ERROR') {
        setIsAccessing(false);
        alert('>> AUTHENTICATION_FAILED: ACCESS_DENIED');
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
    </div>
  );
}
