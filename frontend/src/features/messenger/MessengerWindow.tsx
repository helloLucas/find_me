import React, { useRef, useEffect } from "react";
import { useMessengerStore } from "../../app/store/messengerStore";
import { useStoryRuntimeStore } from "../story-runtime/storyRuntime.store";

const WINDOW_W = 300;
const WINDOW_H = 500;

export const MessengerWindow: React.FC = () => {
  const { conversations, activeRoomId, setActiveRoom, isWindowOpen, closeMessengerWindow, shouldResetPosition, messengerZIndex, focusMessenger } = useMessengerStore();
  const { submitStoryClick } = useStoryRuntimeStore();
  const windowRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const conversation = activeRoomId ? conversations[activeRoomId] : null;
  const allRooms = Object.values(conversations);

  // 드래그 중에는 React 렌더링 없이 ref 값만 갱신한다.
  const drag = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
    startLeft: 0,
    startTop: 0,
  });

  // 창을 새로 열거나 작업 표시줄에서 다시 열면 중앙으로 배치한다.
  useEffect(() => {
    if (!isWindowOpen || !windowRef.current) return;

    if (shouldResetPosition) {
      drag.current.x = Math.round(window.innerWidth / 2 - WINDOW_W / 2);
      drag.current.y = Math.round(window.innerHeight / 2 - WINDOW_H / 2);
      useMessengerStore.setState({ shouldResetPosition: false });
    }

    windowRef.current.style.transform = `translate(${drag.current.x}px, ${drag.current.y}px)`;
  }, [isWindowOpen, shouldResetPosition]);

  // 마지막으로 스크롤이 맞춰진 메시지 개수를 방(Room)별로 기억
  const lastReadIndices = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!isWindowOpen || !conversation) return;

    const roomId = conversation.conversationId;
    const currentLen = conversation.messages.length;
    const lastRead = lastReadIndices.current[roomId] || 0;

    // 이 방에 이전에 읽었던 것보다 더 많은(새로운) 메시지가 추가된 경우
    if (currentLen > lastRead) {
      // 이전에 여기까지 읽었다면, (lastRead - 1) 인덱스가 사용자가 마지막으로 본 메시지입니다 (예: B)
      // 만약 처음으로(0개) 읽는 거라면 그냥 첫 메시지(0번)를 타겟으로 잡습니다.
      const scrollTargetIdx = Math.max(0, lastRead - 1);
      const msgToScroll = conversation.messages[scrollTargetIdx];

      if (msgToScroll) {
        setTimeout(() => {
          const el = document.getElementById(`msg-${msgToScroll.id}`);
          if (el) {
            // 마지막으로 읽은 메시지(B)가 화면 상단 부근에 노출되도록 부드럽게 포커싱
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 50);
      }

      // 여기까지 읽었음을 갱신
      lastReadIndices.current[roomId] = currentLen;
    }
  }, [isWindowOpen, conversation?.conversationId, conversation?.messages.length]);

  // ESC 키로 메신저 창을 닫는다.
  useEffect(() => {
    if (!isWindowOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMessengerWindow();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isWindowOpen, closeMessengerWindow]);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    drag.current.isDragging = true;
    drag.current.startX = e.clientX;
    drag.current.startY = e.clientY;
    drag.current.startLeft = drag.current.x;
    drag.current.startTop = drag.current.y;

    const onMouseMove = (ev: MouseEvent) => {
      if (!drag.current.isDragging) return;
      drag.current.x = drag.current.startLeft + (ev.clientX - drag.current.startX);
      drag.current.y = drag.current.startTop + (ev.clientY - drag.current.startY);
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

  if (!isWindowOpen || !conversation) return null;

  return (
    <div
      ref={windowRef}
      className="absolute top-0 left-0 hover:z-[9999]"
      style={{ width: 400, height: WINDOW_H, zIndex: messengerZIndex }}
      onMouseDown={focusMessenger}
    >
      <div
        className="w-full h-full rounded-lg overflow-hidden flex"
        style={{
          padding: "3px",
          background: "linear-gradient(180deg, #ff3ecf 0%, #0ff 30%, #0ff 70%, #ff3ecf 100%)",
          boxShadow: "0 0 25px rgba(255,62,207,0.4), 0 0 50px rgba(0,255,255,0.15)",
        }}
      >
        {/* 사이드바 추가 - 여러 방 관리 */}
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
          <div
            className="flex items-center justify-between h-9 px-3 bg-[#1a1028] select-none cursor-move flex-shrink-0"
            onMouseDown={handleHeaderMouseDown}
          >
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-xs font-black">MSG</span>
              <span className="text-white text-sm font-bold tracking-wide">
                {conversation.title}
              </span>
              {conversation.online && (
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              )}
            </div>

            <button
              className="w-6 h-5 flex items-center justify-center text-pink-400/70 hover:text-pink-300 transition-colors border border-pink-500/30 rounded-sm"
              onClick={(e) => {
                e.stopPropagation();
                closeMessengerWindow();
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
                    {showAvatar && (
                      <p className="mb-1 text-[10px] font-bold tracking-wide text-blue-300">
                        {msg.senderName}
                      </p>
                    )}
                    <div className="rounded-2xl rounded-bl-sm border border-cyan-400/15 bg-[#24163a] px-3 py-2 shadow-[0_0_18px_rgba(0,255,255,0.06)]">
                      <p className="text-cyan-50 text-[13px] leading-relaxed break-words whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    </div>
                    {msg.timestampLabel && (
                      <p className="mt-1 text-[10px] text-gray-500">{msg.timestampLabel}</p>
                    )}
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
                  <span className="block text-[10px] font-bold tracking-wide text-pink-300">
                    친구가 보낸 링크
                  </span>
                  <span className="mt-1 block text-[13px] font-black text-cyan-100">
                    &lt;{action.label}&gt;
                  </span>
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
              <span className="text-gray-600 text-xs select-none">답장을 입력하세요...</span>
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
