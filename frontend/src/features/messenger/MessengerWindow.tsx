import React, { useEffect, useRef } from "react";
import { useMessengerStore } from "../../app/store/messengerStore";
import { useWindowStore } from "../../app/store/windowStore";
import { useStoryRuntimeStore } from "../story-runtime/storyRuntime.store";
import { DESKTOP_TASKBAR_HEIGHT, type DesktopWindowId } from "../../shared/config/desktopWindows";

const WINDOW_W = 400;
const WINDOW_H = 500;

interface MessengerWindowProps {
  windowId: DesktopWindowId;
}

export const MessengerWindow: React.FC<MessengerWindowProps> = ({ windowId }) => {
  const { conversations, activeRoomId, setActiveRoom, markMessengerSeen } = useMessengerStore();
  const windowState = useWindowStore((state) => state.windows.find((window) => window.id === windowId));
  const { closeWindow, focusWindow } = useWindowStore();
  const { submitStoryClick } = useStoryRuntimeStore();
  const windowRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

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
    if (!windowState || windowState.isMinimized) return;
    markMessengerSeen();
  }, [windowState, markMessengerSeen, activeRoomId]);

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

      drag.current.x = drag.current.startLeft + (moveEvent.clientX - drag.current.startX);
      drag.current.y = drag.current.startTop + (moveEvent.clientY - drag.current.startY);

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
      className="absolute top-0 left-0 font-pixel"
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
              className={`w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden transition-all relative ${
                activeRoomId === room.conversationId
                  ? "border-2 border-primary shadow-[0_0_10px_theme(colors.primary.DEFAULT)]"
                  : "border border-[#2a2040] hover:border-cyan-400/50"
              }`}
            >
              {room.messages[0]?.senderAvatar ? (
                <img src={room.messages[0].senderAvatar} alt={room.title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-gray-500 font-bold px-1 text-center truncate w-full">{room.title.substring(0, 4)}</span>
              )}
              {room.unread && activeRoomId !== room.conversationId && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-[#110a18] shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-[#1a1028]">
          <div className="flex items-center justify-between h-9 px-3 bg-[#1a1028] select-none cursor-move flex-shrink-0" onMouseDown={handleHeaderMouseDown}>
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-xs font-black">MSG</span>
              <span className="text-white text-sm font-bold tracking-wide">{conversation.title}</span>
              {conversation.online && (
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              )}
            </div>

            <button
              className="w-6 h-5 flex items-center justify-center text-pink-400/70 hover:text-pink-300 transition-colors border border-pink-500/30 rounded-sm"
              onClick={(event) => {
                event.stopPropagation();
                closeWindow(windowId);
              }}
            >
              <span className="text-[10px] font-bold">X</span>
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto px-3 py-3 space-y-3 terminal-scrollbar"
            style={{
              background: "linear-gradient(135deg, rgba(20,15,40,0.95) 0%, rgba(15,25,45,0.98) 100%)",
            }}
          >
            {conversation.messages.map((msg, idx) => {
              const showAvatar = idx === 0 || conversation.messages[idx - 1]?.senderId !== msg.senderId;

              return (
                <div id={`msg-${msg.id}`} key={msg.id} className="flex items-end gap-2">
                  {showAvatar ? (
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-[#2a2040] border border-cyan-400/20 flex items-center justify-center overflow-hidden shadow-[0_0_12px_rgba(0,255,255,0.08)]">
                      {msg.senderAvatar ? (
                        <img
                          src={msg.senderAvatar}
                          alt={msg.senderName}
                          className="w-full h-full object-cover"
                          style={{ imageRendering: "pixelated" }}
                        />
                      ) : (
                        <img
                          src="/pixel_messanger_icon.svg"
                          alt={msg.senderName}
                          className="h-5 w-5 object-contain"
                          style={{ imageRendering: "pixelated" }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-9" />
                  )}

                  <div className="max-w-[205px] min-w-0">
                    {showAvatar && <p className="mb-1 text-[10px] font-bold tracking-wide text-blue-300">{msg.senderName}</p>}
                    <div className="rounded-2xl rounded-bl-sm border border-cyan-400/15 bg-[#24163a] px-3 py-2 shadow-[0_0_18px_rgba(0,255,255,0.06)]">
                      <p className="text-cyan-50 text-[13px] leading-relaxed break-words whitespace-pre-wrap">{msg.text}</p>
                    </div>
                    {msg.timestampLabel && <p className="mt-1 text-[10px] text-gray-500">{msg.timestampLabel}</p>}
                  </div>
                </div>
              );
            })}

            {conversation.actions?.map((action, idx) => (
              <div key={`${action.actionType}-${idx}`} className="flex items-end gap-2">
                <div className="flex-shrink-0 w-9" />
                <button
                  className="max-w-[205px] rounded-2xl rounded-bl-sm border border-pink-400/30 bg-[#2b173f] px-3 py-2 text-left shadow-[0_0_18px_rgba(255,62,207,0.12)] transition-colors hover:border-cyan-300/60 hover:bg-[#322050]"
                  onClick={() => submitStoryClick(action.actionType)}
                >
                  <span className="block text-[10px] font-bold tracking-wide text-pink-300">친구가 보낸 링크</span>
                  <span className="mt-1 block text-[13px] font-black text-cyan-100">&lt;{action.label}&gt;</span>
                  <span className="mt-2 inline-flex rounded-full border border-cyan-300/30 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                    열기
                  </span>
                  <span className="mt-1 block text-[10px] text-gray-500">오후 10:18</span>
                </button>
              </div>
            ))}

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
              <span className="text-gray-600 text-xs select-none">메시지를 입력하세요..</span>
            </div>
            <button className="w-7 h-7 flex items-center justify-center bg-cyan-600/80 hover:bg-cyan-500 rounded-sm transition-colors">
              <span className="text-white text-xs font-bold">전송</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
