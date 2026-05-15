import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { useAuthStore } from "../../app/store/authStore";
import { useClientStore } from "../../app/store/clientStore";
import { tokenManager } from "../../shared/utils/tokenManager";
import { useModalStore } from "../../app/store/modalStore";
import axiosInstance from '../../shared/api/axiosInstance';
import { useClipboardStore } from "../../app/store/clipboardStore";

export default function AppShell({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const openModal = useModalStore((state) => state.openModal);
  const { isAccessing, setIsAccessing } = useClientStore();

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

    </div>
  );
}
