import { useEffect } from 'react';
import { useToastStore } from '../../app/store/toastStore';

export const GlobalToast = () => {
  const toast = useToastStore((state) => state.toast);
  const hideToast = useToastStore((state) => state.hideToast);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(hideToast, 2200);
    return () => window.clearTimeout(timer);
  }, [toast, hideToast]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed bottom-16 left-1/2 z-[99998] -translate-x-1/2 px-4">
      <div
        key={toast.id}
        className="lucas-toast rounded-md border border-white/10 bg-gray-700/95 px-4 py-2 text-center font-pixel text-xs leading-relaxed text-white shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur-sm"
      >
        {toast.message}
      </div>
      <style>{`
        @keyframes lucas-toast-fade {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          12%, 82% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(6px) scale(0.98);
          }
        }

        .lucas-toast {
          animation: lucas-toast-fade 2200ms ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};
