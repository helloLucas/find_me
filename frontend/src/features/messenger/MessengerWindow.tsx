import React, { useCallback, useEffect, useRef, useState } from "react";
import { useMessengerStore } from "../../app/store/messengerStore";
import { useWindowStore } from "../../app/store/windowStore";
import { useBrowserContentStore } from "../../app/store/browserContentStore";
import { useStoryRuntimeStore } from "../story-runtime/storyRuntime.store";
import { canSubmitStoryAction } from "../story-runtime/storyActionGuards";
import { DESKTOP_TASKBAR_HEIGHT, type DesktopWindowId } from "../../shared/config/desktopWindows";
import { WindowControlButton } from "../../shared/ui/WindowControls";
import { resolveMessengerFallbackAvatar } from "./avatarFallback";

const WINDOW_W = 430;
const WINDOW_H = 500;
const WINDOW_CLOSE_ANIMATION_MS = 180;
const MESSAGE_ROW_WIDTH = 248;
const MESSAGE_BUBBLE_WIDTH = 198;
const MESSAGE_TIME_SLOT_WIDTH = MESSAGE_ROW_WIDTH - MESSAGE_BUBBLE_WIDTH;
const MESSAGE_PLACEHOLDER = "\uBA54\uC2DC\uC9C0\uB97C \uC785\uB825\uD558\uC138\uC694..";

const messageRowStyle: React.CSSProperties = {
  width: MESSAGE_ROW_WIDTH,
};

const messageBodySlotStyle: React.CSSProperties = {
  boxSizing: "border-box",
  paddingRight: MESSAGE_TIME_SLOT_WIDTH,
  width: MESSAGE_ROW_WIDTH,
};

const messageBubbleStyle: React.CSSProperties = {
  boxSizing: "border-box",
  display: "inline-block",
  maxWidth: MESSAGE_BUBBLE_WIDTH,
};

const linkPreviewStyle: React.CSSProperties = {
  boxSizing: "border-box",
  width: MESSAGE_BUBBLE_WIDTH,
};

type LinkPreview = {
  title: string;
  description: string;
  source: string;
  thumbnailImage?: string;
};

const DEFAULT_LINK_THUMBNAIL_STYLE: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(135deg, rgba(5,217,232,0.18), rgba(255,62,207,0.16) 44%, rgba(5,9,22,0.86)), linear-gradient(90deg, #1b263a 0 16%, #080b16 16% 18%, #26344c 18% 30%, #080b16 30% 32%, #10182a 32% 100%)",
};

function getLinkThumbnailStyle(preview: LinkPreview): React.CSSProperties {
  if (!preview.thumbnailImage) return DEFAULT_LINK_THUMBNAIL_STYLE;

  return {
    backgroundImage: `linear-gradient(135deg, rgba(5, 9, 22, 0.08), rgba(18, 13, 34, 0.26)), url(${preview.thumbnailImage})`,
    backgroundPosition: "center",
    backgroundSize: "cover",
  };
}

const LINK_PREVIEW_BY_ACTION: Record<string, LinkPreview> = {
  friend_message_link: {
    title: "사라지는 사람들, 같은 장소의 다른 목격담",
    description: "도시 외곽 실종 사건을 둘러싼 이상한 진술들",
    source: "voidcity-news",
  },
  friend_message_link_ch3: {
    title: "Cyber Packet Dash",
    description: "손상된 조각 복구 세션으로 이동",
    source: "system://cyberpacketdash",
    thumbnailImage: "/packet_dash_bg.png",
  },
};

interface MessengerWindowProps {
  windowId: DesktopWindowId;
}

export const MessengerWindow: React.FC<MessengerWindowProps> = ({ windowId }) => {
  const { conversations, activeRoomId, setActiveRoom, markMessengerSeen } = useMessengerStore();
  const windowState = useWindowStore((state) => state.windows.find((window) => window.id === windowId));
  const { closeWindow, markWindowClosing, focusWindow, openWindow } = useWindowStore();
  const { currentNode, submitStoryClick } = useStoryRuntimeStore();
  const windowRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const wasVisibleRef = useRef(false);
  const [isClosing, setIsClosing] = useState(false);

  const conversation = activeRoomId ? conversations[activeRoomId] : null;
  const allRooms = Object.values(conversations);
  const drag = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    x: typeof window !== "undefined" ? Math.round(window.innerWidth / 2 - WINDOW_W / 2) : 0,
    y:
      typeof window !== "undefined"
        ? Math.round((window.innerHeight - DESKTOP_TASKBAR_HEIGHT) / 2 - WINDOW_H / 2)
        : 0,
    startLeft: 0,
    startTop: 0,
  });
  const lastReadIndices = useRef<Record<string, number>>({});

  const handleClose = useCallback(() => {
    if (isClosing) return;

    setIsClosing(true);
    markWindowClosing(windowId);
    window.setTimeout(() => {
      closeWindow(windowId);
    }, WINDOW_CLOSE_ANIMATION_MS);
  }, [closeWindow, isClosing, markWindowClosing, windowId]);

  const isInCh3 = Boolean(currentNode?.code?.startsWith("CH3_"));
  const visibleMessages = conversation?.messages.filter((msg) => {
    const isCh3GameMessage =
      msg.id.includes("CH3_") ||
      msg.text.includes("Cyber Packet Dash") ||
      msg.text.includes("조각 복구");
    return !isCh3GameMessage || isInCh3;
  }) ?? [];
  const visibleActions =
    conversation?.actions?.filter((action) => action.actionType !== "friend_message_link_ch3" || isInCh3) ?? [];
  const hasVisibleActions = visibleActions.length > 0;

  useEffect(() => {
    if (!windowState || !windowRef.current) return;
    windowRef.current.style.transform = `translate(${drag.current.x}px, ${drag.current.y}px)`;
  }, [windowState]);

  useEffect(() => {
    if (!windowState || windowState.isMinimized || !conversation) return;

    const roomId = conversation.conversationId;
    const currentLen = conversation.messages.length;
    const lastRead = lastReadIndices.current[roomId] || 0;

    if (currentLen > lastRead) {
      const scrollTargetIdx = Math.max(0, lastRead - 1);
      const msgToScroll = conversation.messages[scrollTargetIdx];

      if (msgToScroll) {
        setTimeout(() => {
          const element = document.getElementById(`msg-${msgToScroll.id}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 50);
      }

      lastReadIndices.current[roomId] = currentLen;
    }
  }, [windowState, conversation]);

  useEffect(() => {
    const isVisible = Boolean(windowState && !windowState.isMinimized);

    if (isVisible && !wasVisibleRef.current) {
      markMessengerSeen();
    }

    wasVisibleRef.current = isVisible;
  }, [windowState, markMessengerSeen]);

  useEffect(() => {
    if (!windowState || windowState.isMinimized) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [windowState, handleClose]);

  const handleHeaderMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    focusWindow(windowId);
    drag.current.isDragging = true;
    drag.current.startX = event.clientX;
    drag.current.startY = event.clientY;
    drag.current.startLeft = drag.current.x;
    drag.current.startTop = drag.current.y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!drag.current.isDragging) return;

      const nextX = drag.current.startLeft + (moveEvent.clientX - drag.current.startX);
      const nextY = drag.current.startTop + (moveEvent.clientY - drag.current.startY);

      const availableWidth = window.innerWidth;
      const availableHeight = window.innerHeight - DESKTOP_TASKBAR_HEIGHT;

      drag.current.x = Math.min(Math.max(nextX, 0), Math.max(0, availableWidth - WINDOW_W));
      drag.current.y = Math.min(Math.max(nextY, 0), Math.max(0, availableHeight - WINDOW_H));

      if (windowRef.current) {
        windowRef.current.style.transform = `translate(${drag.current.x}px, ${drag.current.y}px)`;
      }
    };

    const onMouseUp = () => {
      drag.current.isDragging = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  if (!windowState || !conversation) return null;

  return (
    <div
      ref={windowRef}
      className="absolute top-0 left-0 font-messenger"
      style={{
        width: WINDOW_W,
        height: WINDOW_H,
        zIndex: windowState.zIndex,
        pointerEvents: windowState.isMinimized || isClosing ? "none" : "auto",
      }}
      onMouseDown={() => focusWindow(windowId)}
    >
      <div
        className={`desktop-window-shell w-full h-full rounded-lg overflow-hidden flex ${
          windowState.isMinimized ? "desktop-window-shell--minimized" : ""
        } ${isClosing ? "desktop-window-shell--closing" : ""
        }`}
        style={{
          padding: "3px",
          background: "linear-gradient(180deg, #ff3ecf 0%, #0ff 30%, #0ff 70%, #ff3ecf 100%)",
          boxShadow: "0 0 25px rgba(255,62,207,0.4), 0 0 50px rgba(0,255,255,0.15)",
        }}
      >
        <div className="w-[84px] rounded-l-[5px] bg-[#110a18] flex flex-col items-center py-2 gap-2 border-r border-[#3a2040]">
          {allRooms.map((room) => (
            <button
              key={room.conversationId}
              title={room.title}
              onClick={() => setActiveRoom(room.conversationId)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center overflow-visible transition-all relative ${
                activeRoomId === room.conversationId
                  ? "border-2 border-primary shadow-[0_0_10px_theme(colors.primary.DEFAULT)]"
                  : "border border-[#2a2040] hover:border-cyan-400/50"
              }`}
            >
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl">
                {room.messages[0]?.senderAvatar ? (
                  <img src={room.messages[0].senderAvatar} alt={room.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#414561] p-1.5">
                    <img
                      src={resolveMessengerFallbackAvatar(room.messages[0]?.senderId, room.messages[0]?.senderName)}
                      alt={room.title}
                      className="h-full w-full object-contain"
                      style={{ imageRendering: "auto" }}
                    />
                  </div>
                )}
              </div>
              {room.unread && activeRoomId !== room.conversationId && (
                <span className="absolute -top-1 -right-1 z-10 w-3.5 h-3.5 bg-red-500 rounded-full border border-[#110a18] shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden rounded-r-[5px] bg-[#1a1028]">
          <div
            className="flex h-9 cursor-default select-none items-center justify-between bg-[#1a1028] px-3 flex-shrink-0"
            onMouseDown={handleHeaderMouseDown}
          >
            <div className="flex items-center gap-2">
              {/* <span className="text-blue-400 text-xs">MSG</span> */}
              <span className="text-white text-sm tracking-wide">{conversation.title}</span>
              {conversation.online && (
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              )}
            </div>

            <WindowControlButton
              variant="close"
              label="Close"
              className="border-pink-500/30 text-pink-400/70 hover:border-pink-400/70 hover:bg-pink-500/10 hover:text-pink-300"
              onClick={(event) => {
                event.stopPropagation();
                handleClose();
              }}
            />
          </div>

          <div
            className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 terminal-scrollbar"
            style={{
              background: "linear-gradient(135deg, rgba(20,15,40,0.95) 0%, rgba(15,25,45,0.98) 100%)",
            }}
          >
            {visibleMessages.map((msg, idx) => {
              const previousMessage = visibleMessages[idx - 1];
              const nextMessage = visibleMessages[idx + 1];
              const isFirstInGroup = !previousMessage || previousMessage.senderId !== msg.senderId;
              const isLastInGroup = !nextMessage || nextMessage.senderId !== msg.senderId;
              const avatarSrc =
                msg.senderAvatar ?? resolveMessengerFallbackAvatar(msg.senderId, msg.senderName);
              const shouldShowMessageTimestamp =
                isLastInGroup && Boolean(msg.timestampLabel) && !(hasVisibleActions && idx === visibleMessages.length - 1);

              return (
                <div
                  id={`msg-${msg.id}`}
                  key={msg.id}
                  className={`flex items-start gap-2 ${isFirstInGroup ? "mt-3 first:mt-0" : "mt-1"}`}
                >
                  {isFirstInGroup ? (
                    <div className="mt-5 flex-shrink-0 w-9 h-9 rounded-full bg-[#2a2040] border border-cyan-400/20 flex items-center justify-center overflow-hidden shadow-[0_0_12px_rgba(0,255,255,0.08)]">
                      <img
                        src={avatarSrc}
                        alt={msg.senderName}
                        className={msg.senderAvatar ? "w-full h-full object-cover" : "h-full w-full object-contain p-0.5"}
                        style={{ imageRendering: msg.senderAvatar ? "pixelated" : "auto" }}
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-9" />
                  )}

                  <div className="min-w-0" style={messageRowStyle}>
                    {isFirstInGroup && <p className="mb-1 text-[10px] tracking-wide text-blue-300">{msg.senderName}</p>}
                    <div className="relative" style={messageBodySlotStyle}>
                      <div
                        className={`relative rounded-lg border border-cyan-300/25 bg-[#120d22] px-3 py-2 shadow-[0_0_18px_rgba(0,255,255,0.1),0_0_22px_rgba(255,62,207,0.08)] ${
                          isFirstInGroup ? "rounded-tl-sm" : "rounded-tl-lg"
                        }`}
                        style={messageBubbleStyle}
                      >
                        {isFirstInGroup && (
                          <span
                            aria-hidden="true"
                            className="absolute left-[-5px] top-2 h-3 w-3 rotate-45 border-b border-l border-cyan-300/25 bg-[#120d22] shadow-[0_0_10px_rgba(0,255,255,0.08)]"
                          />
                        )}
                        <p className="relative text-cyan-50 text-[13px] leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
                      </div>
                      {shouldShowMessageTimestamp && (
                        <p className="absolute bottom-0 right-0 whitespace-nowrap text-[10px] leading-none text-gray-500">
                          {msg.timestampLabel}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {visibleActions.map((action, idx) => {
              const canClickAction = canSubmitStoryAction(
                currentNode,
                "click",
                action.actionType
              );
              const isAlwaysClickable = action.actionType === "friend_message_link" || (action.actionType === "friend_message_link_ch3" && isInCh3);
              const isEnabled = canClickAction || isAlwaysClickable;
              const preview = LINK_PREVIEW_BY_ACTION[action.actionType] ?? {
                title: action.label,
                description: "공유된 링크를 열어 확인",
                source: "MESSAGE LINK",
              };
              const thumbnailStyle = getLinkThumbnailStyle(preview);
              const shouldShowActionTimestamp = idx === visibleActions.length - 1 && Boolean(action.timestampLabel);

              return (
                <div key={`${action.actionType}-${idx}`} className="mt-1 flex items-start gap-2">
                  <div className="flex-shrink-0 w-9" />
                  <div className="relative" style={messageBodySlotStyle}>
                    <div
                      className={`relative overflow-hidden rounded-lg border border-cyan-300/25 bg-[#120d22] shadow-[0_0_18px_rgba(0,255,255,0.1),0_0_22px_rgba(255,62,207,0.08)] transition-colors ${
                        isEnabled
                          ? "cursor-pointer hover:border-cyan-200/70 hover:bg-[#17102d]"
                          : "cursor-not-allowed opacity-50"
                      }`}
                      style={linkPreviewStyle}
                    >
                      <button
                        type="button"
                        className="absolute inset-0 z-10 block h-full w-full cursor-inherit appearance-none bg-transparent p-0"
                        onClick={() => {
                          if (canClickAction) {
                            void submitStoryClick(action.actionType);
                            if (action.actionType === "friend_message_link") {
                              useBrowserContentStore.getState().triggerNewsTabClick();
                            } else if (action.actionType === "friend_message_link_ch3") {
                              useBrowserContentStore.getState().triggerCyberPacketDashTabClick();
                            }
                          } else if (isAlwaysClickable) {
                            openWindow("chrome");
                            if (action.actionType === "friend_message_link") {
                              useBrowserContentStore.getState().triggerNewsTabClick();
                            } else if (action.actionType === "friend_message_link_ch3") {
                              useBrowserContentStore.getState().triggerCyberPacketDashTabClick();
                            }
                          }
                        }}
                        disabled={!isEnabled}
                        aria-label={action.label}
                      />
                      <span
                        className="pointer-events-none block h-24 w-full border-b border-cyan-300/15 bg-[#080b16]"
                        style={thumbnailStyle}
                      />
                      <span className="pointer-events-none block w-full px-3 py-3">
                        <span className="block text-[13px] font-semibold leading-snug text-cyan-50">{preview.title}</span>
                        <span className="mt-1 block line-clamp-2 text-[11px] leading-snug text-cyan-100/55">{preview.description}</span>
                        <span className="mt-2 block truncate text-[11px] font-semibold text-fuchsia-200/70">{preview.source}</span>
                      </span>
                    </div>
                    {shouldShowActionTimestamp && (
                      <p className="absolute bottom-0 right-0 whitespace-nowrap text-[10px] leading-none text-gray-500">
                        {action.timestampLabel}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            <div ref={messageEndRef} />
          </div>

          <div
            className="flex h-[52px] flex-shrink-0 items-center gap-2 px-3"
            style={{
              background: "linear-gradient(to right, rgba(20,15,40,0.95), rgba(15,25,45,0.98))",
              borderTop: "1px solid rgba(0,255,255,0.1)",
            }}
          >
            <div className="box-border flex h-9 min-h-9 flex-1 items-center rounded-[6px] border border-cyan-300/20 bg-[#0d0a18] px-3 shadow-[inset_0_0_12px_rgba(0,255,255,0.04)]">
              <span className="select-none text-xs leading-none text-cyan-100/60">{MESSAGE_PLACEHOLDER}</span>
            </div>
            <button
              type="button"
              className="box-border flex h-9 min-h-9 w-9 min-w-9 shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-fuchsia-300/60 bg-[#15051d] p-0 shadow-[0_0_10px_rgba(234,51,247,0.42),inset_0_0_10px_rgba(234,51,247,0.16)] transition-all hover:border-fuchsia-100 hover:bg-[#23072d] hover:shadow-[0_0_16px_rgba(234,51,247,0.72),0_0_24px_rgba(0,255,255,0.18),inset_0_0_12px_rgba(234,51,247,0.22)] active:scale-95"
              aria-label="\uBA54\uC2DC\uC9C0 \uBCF4\uB0B4\uAE30"
            >
              <img
                aria-hidden="true"
                src="/send_icon.svg"
                alt=""
                className="block h-4 w-4 drop-shadow-[0_0_7px_rgba(234,51,247,0.95)]"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
