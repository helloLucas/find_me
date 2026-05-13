import React, { useEffect, useRef } from "react";
import { useMessengerStore } from "../../app/store/messengerStore";
import { useWindowStore } from "../../app/store/windowStore";
import { useBrowserContentStore } from "../../app/store/browserContentStore";
import { useStoryRuntimeStore } from "../story-runtime/storyRuntime.store";
import { canSubmitStoryAction } from "../story-runtime/storyActionGuards";
import { DESKTOP_TASKBAR_HEIGHT, type DesktopWindowId } from "../../shared/config/desktopWindows";
import { WindowControlButton } from "../../shared/ui/WindowControls";
import { resolveMessengerFallbackAvatar } from "./avatarFallback";

const WINDOW_W = 400;
const WINDOW_H = 500;
const LINK_LABEL = "\uCE5C\uAD6C\uAC00 \uBCF4\uB0B8 \uB9C1\uD06C";
const OPEN_LABEL = "\uC5F4\uAE30";
const TIMESTAMP_LABEL = "\uC624\uD6C4 10:18";
const MESSAGE_PLACEHOLDER = "\uBA54\uC2DC\uC9C0\uB97C \uC785\uB825\uD558\uC138\uC694..";

interface MessengerWindowProps {
  windowId: DesktopWindowId;
}

export const MessengerWindow: React.FC<MessengerWindowProps> = ({ windowId }) => {
  const { conversations, activeRoomId, setActiveRoom, markMessengerSeen } = useMessengerStore();
  const windowState = useWindowStore((state) => state.windows.find((window) => window.id === windowId));
  const { closeWindow, focusWindow, openWindow } = useWindowStore();
  const { currentNode, submitStoryClick } = useStoryRuntimeStore();
  const windowRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const wasVisibleRef = useRef(false);

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
        closeWindow(windowId);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [windowState, closeWindow, windowId]);

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
        pointerEvents: windowState.isMinimized ? "none" : "auto",
      }}
      onMouseDown={() => focusWindow(windowId)}
    >
      <div
        className="w-full h-full rounded-lg overflow-hidden flex transition-all duration-300 ease-in-out origin-bottom"
        style={{
          opacity: windowState.isMinimized ? 0 : 1,
          transform: windowState.isMinimized ? "scale(0.8) translateY(100px)" : "scale(1) translateY(0)",
          padding: "3px",
          background: "linear-gradient(180deg, #ff3ecf 0%, #0ff 30%, #0ff 70%, #ff3ecf 100%)",
          boxShadow: "0 0 25px rgba(255,62,207,0.4), 0 0 50px rgba(0,255,255,0.15)",
        }}
      >
        <div className="w-[84px] bg-[#110a18] flex flex-col items-center py-2 gap-2 border-r border-[#3a2040]">
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

        <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1028]">
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
                closeWindow(windowId);
              }}
            />
          </div>

          <div
            className="flex-1 overflow-y-auto px-3 py-3 space-y-3 terminal-scrollbar"
            style={{
              background: "linear-gradient(135deg, rgba(20,15,40,0.95) 0%, rgba(15,25,45,0.98) 100%)",
            }}
          >
            {conversation.messages.map((msg, idx) => {
              const isCh3GameMessage = msg.id.includes("CH3_") || msg.text.includes("Cyber Packet Dash") || msg.text.includes("조각 복구");
              const isInCh3 = Boolean(currentNode?.code?.startsWith("CH3_"));
              if (isCh3GameMessage && !isInCh3) return null;

              const showSenderName = idx === 0 || conversation.messages[idx - 1]?.senderId !== msg.senderId;
              const avatarSrc =
                msg.senderAvatar ?? resolveMessengerFallbackAvatar(msg.senderId, msg.senderName);

              return (
                <div id={`msg-${msg.id}`} key={msg.id} className="flex items-end gap-2">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#2a2040] border border-cyan-400/20 flex items-center justify-center overflow-hidden shadow-[0_0_12px_rgba(0,255,255,0.08)]">
                    <img
                      src={avatarSrc}
                      alt={msg.senderName}
                      className={msg.senderAvatar ? "w-full h-full object-cover" : "h-full w-full object-contain p-0.5"}
                      style={{ imageRendering: msg.senderAvatar ? "pixelated" : "auto" }}
                    />
                  </div>

                  <div className="max-w-[205px] min-w-0">
                    {showSenderName && <p className="mb-1 text-[10px] tracking-wide text-blue-300">{msg.senderName}</p>}
                    <div className="rounded-2xl rounded-bl-sm border border-cyan-400/15 bg-[#24163a] px-3 py-2 shadow-[0_0_18px_rgba(0,255,255,0.06)]">
                      <p className="text-cyan-50 text-[13px] leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
                    </div>
                    {msg.timestampLabel && <p className="mt-1 text-[10px] text-gray-500">{msg.timestampLabel}</p>}
                  </div>
                </div>
              );
            })}

            {conversation.actions?.map((action, idx) => {
              const isCh3GameAction = action.actionType === "friend_message_link_ch3";
              const isInCh3 = Boolean(currentNode?.code?.startsWith("CH3_"));
              if (isCh3GameAction && !isInCh3) return null;

              const canClickAction = canSubmitStoryAction(
                currentNode,
                "click",
                action.actionType
              );
              const isAlwaysClickable = action.actionType === "friend_message_link" || (action.actionType === "friend_message_link_ch3" && isInCh3);
              const isEnabled = canClickAction || isAlwaysClickable;

              return (
                <div key={`${action.actionType}-${idx}`} className="flex items-end gap-2">
                  <div className="flex-shrink-0 w-9" />
                  <button
                    className="max-w-[205px] rounded-2xl rounded-bl-sm border border-pink-400/30 bg-[#2b173f] px-3 py-2 text-left shadow-[0_0_18px_rgba(255,62,207,0.12)] transition-colors hover:border-cyan-300/60 hover:bg-[#322050] disabled:cursor-not-allowed disabled:opacity-50"
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
                  >
                    <span className="block text-[10px] tracking-wide text-pink-300">{LINK_LABEL}</span>
                    <span className="mt-1 block text-[13px] text-cyan-100">&lt;{action.label}&gt;</span>
                    <span className="mt-2 inline-flex rounded-full border border-cyan-300/30 px-2 py-0.5 text-[10px] text-cyan-200">
                      {OPEN_LABEL}
                    </span>
                    <span className="mt-1 block text-[10px] text-gray-500">{TIMESTAMP_LABEL}</span>
                  </button>
                </div>
              );
            })}

            <div ref={messageEndRef} />
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
            style={{
              background: "linear-gradient(to right, rgba(20,15,40,0.95), rgba(15,25,45,0.98))",
              borderTop: "1px solid rgba(0,255,255,0.1)",
            }}
          >
            <div className="flex-1 h-7 rounded-sm bg-[#0d0a18] border border-gray-700/50 px-2 flex items-center">
              <span className="text-gray-600 text-xs select-none">{MESSAGE_PLACEHOLDER}</span>
            </div>
            <button className="w-7 h-7 flex items-center justify-center bg-cyan-600/80 hover:bg-cyan-500 rounded-sm transition-colors">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-3.5 w-3.5 text-white"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ transform: "translateX(0.5px) scaleX(-1)" }}
              >
                <path
                  d="M3.2 10L16.4 4.6L13.6 10L16.4 15.4L3.2 10Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path d="M13.6 10H8.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
