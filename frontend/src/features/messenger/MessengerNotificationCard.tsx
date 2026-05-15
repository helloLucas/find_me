import React, { useEffect, useState } from "react";
import { useMessengerStore } from "../../app/store/messengerStore";
import { useWindowStore } from "../../app/store/windowStore";
import { useStoryRuntimeStore } from "../story-runtime/storyRuntime.store";
import { canSubmitStoryAction } from "../story-runtime/storyActionGuards";
import { DESKTOP_LAYER } from "../../shared/config/desktopWindows";
import { resolveMessengerFallbackAvatar } from "./avatarFallback";
import type { MessengerConversation } from "./messenger.types";

const NOTIFICATION_EXIT_ANIMATION_MS = 275;

export const MessengerNotificationCard: React.FC = () => {
  const { conversations, activeRoomId, isNotificationVisible, isUnread, markMessengerSeen } =
    useMessengerStore();
  const openWindow = useWindowStore((state) => state.openWindow);
  const { currentNode, submitStoryClick } = useStoryRuntimeStore();
  const [renderedConversation, setRenderedConversation] = useState<MessengerConversation | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const conversation = activeRoomId ? conversations[activeRoomId] : null;

  useEffect(() => {
    if (isNotificationVisible && conversation) {
      const timeoutId = window.setTimeout(() => {
        setRenderedConversation(conversation);
        setIsLeaving(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    if (!renderedConversation) return;

    const startExitTimeoutId = window.setTimeout(() => {
      setIsLeaving(true);
    }, 0);
    const removeTimeoutId = window.setTimeout(() => {
      setRenderedConversation(null);
      setIsLeaving(false);
    }, NOTIFICATION_EXIT_ANIMATION_MS);

    return () => {
      window.clearTimeout(startExitTimeoutId);
      window.clearTimeout(removeTimeoutId);
    };
  }, [conversation, isNotificationVisible, renderedConversation]);

  const displayConversation = isNotificationVisible && conversation ? conversation : renderedConversation;
  const isExiting = !isNotificationVisible && isLeaving;

  if (!displayConversation) return null;

  const preview = displayConversation.messages[displayConversation.messages.length - 1] ?? null;
  if (!preview) return null;

  const handleOpenNotification = () => {
    openWindow("messenger");
    markMessengerSeen();

    const validClickAction = displayConversation.actions?.find((action) =>
      canSubmitStoryAction(currentNode, "click", action.actionType)
    );
    const openChatAction = validClickAction ??
      displayConversation.actions?.find((action) => action.actionType === "open_friend_chat");

    if (openChatAction && canSubmitStoryAction(currentNode, "click", openChatAction.actionType)) {
      void submitStoryClick(openChatAction.actionType);
    }
  };

  return (
    <div
      className="fixed bottom-14 right-4 z-[1500] cursor-pointer select-none font-messenger"
      style={{
        zIndex: DESKTOP_LAYER.notification,
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? "translate3d(18px, 14px, 0) scale(0.96)" : "translate3d(0, 0, 0) scale(1)",
        transition: `opacity ${NOTIFICATION_EXIT_ANIMATION_MS}ms ease, transform ${NOTIFICATION_EXIT_ANIMATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        animation: isExiting ? undefined : "messenger-notification-enter 275ms cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: isExiting ? "none" : "auto",
      }}
      onClick={handleOpenNotification}
    >
      <style>{`
        @keyframes messenger-notification-enter {
          0% {
            opacity: 0;
            transform: translate3d(18px, 14px, 0) scale(0.96);
            filter: brightness(1.18) saturate(1.12);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
            filter: brightness(1) saturate(1);
          }
        }
      `}</style>
      <div
        className={`
          relative w-[320px] rounded-lg overflow-hidden
          transition-[box-shadow,filter] duration-200 ease-out
        `}
        style={{
          padding: "1px",
          background: "linear-gradient(180deg, #ff3ecf 0%, #0ff 30%, #0ff 70%, #ff3ecf 100%)",
          boxShadow: isUnread
            ? "0 0 12px rgba(255,62,207,0.32), 0 0 22px rgba(0,255,255,0.12), inset 0 0 8px rgba(255,62,207,0.12)"
            : "0 0 12px rgba(255,62,207,0.24), 0 0 24px rgba(0,255,255,0.08)",
        }}
      >
        <div className="rounded-[7px] overflow-hidden bg-[#1a1028]">
          <div className="flex items-center justify-between px-3 py-2 bg-[#1a1028]">
            <div className="flex items-center gap-2">
              {/* <span className="text-blue-400 text-xs font-black">MSG</span> */}
              <span className="text-white text-sm font-bold tracking-wide">
                {displayConversation.title}
              </span>
              {displayConversation.online && (
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              )}
            </div>
            <span className="text-cyan-400 text-xs font-bold">열기</span>
          </div>

          <div
            className="mx-2 mb-2 px-3 py-3 rounded-md flex gap-3 items-start"
            style={{
              background: "linear-gradient(135deg, rgba(30,20,60,0.9) 0%, rgba(20,30,50,0.95) 100%)",
              border: "1px solid rgba(0,255,255,0.1)",
              boxShadow: "inset 0 0 20px rgba(0,255,255,0.03)",
            }}
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#2a2040] border border-cyan-400/20 flex items-center justify-center overflow-hidden">
              {preview.senderAvatar ? (
                <img
                  src={preview.senderAvatar}
                  alt={preview.senderName}
                  className="w-full h-full object-cover"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <img
                  src={resolveMessengerFallbackAvatar(preview.senderId, preview.senderName)}
                  alt={preview.senderName}
                  className="h-full w-full object-contain p-1"
                  style={{ imageRendering: "auto" }}
                />
              )}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-cyan-200 text-sm font-bold leading-snug break-words">
                새로운 메시지가 도착했습니다.
              </p>
              {preview.timestampLabel && (
                <p className="text-gray-400 text-xs mt-1.5">{preview.timestampLabel}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
