import React from "react";
import { useMessengerStore } from "../../app/store/messengerStore";
import { useWindowStore } from "../../app/store/windowStore";
import { useStoryRuntimeStore } from "../story-runtime/storyRuntime.store";
import { canSubmitStoryAction } from "../story-runtime/storyActionGuards";
import { DESKTOP_LAYER } from "../../shared/config/desktopWindows";
import { resolveMessengerFallbackAvatar } from "./avatarFallback";

export const MessengerNotificationCard: React.FC = () => {
  const { conversations, activeRoomId, isNotificationVisible, isUnread, markMessengerSeen } =
    useMessengerStore();
  const openWindow = useWindowStore((state) => state.openWindow);
  const { currentNode, submitStoryClick } = useStoryRuntimeStore();

  const conversation = activeRoomId ? conversations[activeRoomId] : null;

  if (!isNotificationVisible || !conversation) return null;

  const preview = conversation.messages[conversation.messages.length - 1] ?? null;
  if (!preview) return null;

  const maxLen = 18;
  const previewText =
    preview.text.length > maxLen
      ? `${preview.text.slice(0, maxLen)}...`
      : preview.text;

  const handleOpenNotification = () => {
    openWindow("messenger");
    markMessengerSeen();

    const validClickAction = conversation.actions?.find((action) =>
      canSubmitStoryAction(currentNode, "click", action.actionType)
    );
    const openChatAction = validClickAction ??
      conversation.actions?.find((action) => action.actionType === "open_friend_chat");

    if (openChatAction && canSubmitStoryAction(currentNode, "click", openChatAction.actionType)) {
      void submitStoryClick(openChatAction.actionType);
    }
  };

  return (
    <div
      className="fixed bottom-14 right-4 z-[1500] cursor-pointer select-none font-pixel"
      style={{ zIndex: DESKTOP_LAYER.notification }}
      onClick={handleOpenNotification}
    >
      <div
        className={`
          relative w-[320px] rounded-lg overflow-hidden
          ${isUnread ? "animate-pulse" : ""}
        `}
        style={{
          padding: "3px",
          background: "linear-gradient(180deg, #ff3ecf 0%, #0ff 30%, #0ff 70%, #ff3ecf 100%)",
          boxShadow: isUnread
            ? "0 0 25px rgba(255,62,207,0.5), 0 0 50px rgba(0,255,255,0.2), inset 0 0 15px rgba(255,62,207,0.2)"
            : "0 0 15px rgba(255,62,207,0.3), 0 0 30px rgba(0,255,255,0.1)",
        }}
      >
        <div className="rounded-[5px] overflow-hidden bg-[#1a1028]">
          <div className="flex items-center justify-between px-3 py-2 bg-[#1a1028]">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-xs font-black">MSG</span>
              <span className="text-white text-sm font-bold tracking-wide">
                {conversation.title}
              </span>
              {conversation.online && (
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
