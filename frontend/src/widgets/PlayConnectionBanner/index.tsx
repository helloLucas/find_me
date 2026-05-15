import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { env } from '../../shared/config/env';
import { isConnectionError } from '../../shared/api/apiError';
import { useConnectionStatusStore } from '../../app/store/connectionStatusStore';

export const PlayConnectionBanner = () => {
  const navigate = useNavigate();
  const { status, isRetrying, markOnline, markOffline, setRetrying } = useConnectionStatusStore();

  if (status !== 'offline') return null;

  const handleRetry = async () => {
    if (isRetrying) return;

    setRetrying(true);
    try {
      await axios.get(`${env.apiBaseUrl}/api/v1/health`, {
        withCredentials: true,
        params: { retry: Date.now() },
      });
      markOnline();
    } catch (error) {
      if (isConnectionError(error)) {
        markOffline();
      }
      setRetrying(false);
    }
  };

  const handleExit = () => {
    markOnline();
    navigate('/lobby', { replace: true });
  };

  return (
    <div className="fixed inset-x-0 bottom-16 z-[90000] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex w-full max-w-xl items-center justify-between gap-4 border border-red-400/70 bg-[#1a0306]/60 px-5 py-3 text-white shadow-[0_0_24px_rgba(248,113,113,0.35),0_18px_45px_rgba(0,0,0,0.55)] backdrop-blur-md">

        <div className="min-w-0 flex items-center gap-3">
          <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-400 shadow-[0_0_12px_rgba(252,165,165,0.95)]" />

          <div className="min-w-0">
            <p className="truncate font-system-overlay text-sm text-white">
              네트워크 상태를 확인해 주세요.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="border border-[#a3e635]/70 bg-[#a3e635]/10 px-4 py-2 font-system-overlay text-[11px] text-[#d9ff99] shadow-[0_0_12px_rgba(163,230,53,0.18)] transition-colors hover:bg-[#a3e635]/20 disabled:cursor-wait disabled:opacity-50"
          >
            {isRetrying ? '확인 중' : '재시도'}
          </button>
          <button
            type="button"
            onClick={handleExit}
            className="border border-white/35 bg-white/5 px-4 py-2 font-system-overlay text-[11px] text-white/85 transition-colors hover:bg-white/15 hover:text-white"
          >
            종료
          </button>
        </div>
      </div>
    </div>
  );
};
