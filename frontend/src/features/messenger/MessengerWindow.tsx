import React, { useRef, useEffect } from "react";
import { useMessengerStore } from "../../app/store/messengerStore";

const WINDOW_W = 300;
const WINDOW_H = 500;

export const MessengerWindow: React.FC = () => {
  const { conversation, isWindowOpen, closeMessengerWindow, shouldResetPosition } = useMessengerStore();
  const windowRef = useRef<HTMLDivElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Drag state tracked via refs (no React re-renders during drag)
  const drag = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
    startLeft: 0,
    startTop: 0,
  });

  // Apply position every time the window opens
  // Re-center when shouldResetPosition is true (taskbar click or new conversation)
  useEffect(() => {
    if (!isWindowOpen || !windowRef.current) return;

    if (shouldResetPosition) {
      drag.current.x = Math.round(window.innerWidth / 2 - WINDOW_W / 2);
      drag.current.y = Math.round(window.innerHeight / 2 - WINDOW_H / 2);
      // Clear the flag after consuming it
      useMessengerStore.setState({ shouldResetPosition: false });
    }

    windowRef.current.style.transform = `translate(${drag.current.x}px, ${drag.current.y}px)`;
  }, [isWindowOpen, shouldResetPosition]);

  // Scroll to bottom on open
  useEffect(() => {
    if (isWindowOpen) {
      setTimeout(() => messageEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [isWindowOpen]);

  // ESC to close
  useEffect(() => {
    if (!isWindowOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMessengerWindow();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isWindowOpen, closeMessengerWindow]);

  // ── Drag handler ──
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
      className="absolute top-0 left-0 z-50"
      style={{ width: WINDOW_W, height: WINDOW_H }}
    >
      {/* Neon gradient outer frame */}
      <div
        className="w-full h-full rounded-lg overflow-hidden flex flex-col"
        style={{
          padding: "3px",
          background: "linear-gradient(180deg, #ff3ecf 0%, #0ff 30%, #0ff 70%, #ff3ecf 100%)",
          boxShadow: "0 0 25px rgba(255,62,207,0.4), 0 0 50px rgba(0,255,255,0.15)",
        }}
      >
        {/* Inner window */}
        <div className="flex-1 flex flex-col rounded-[5px] overflow-hidden bg-[#1a1028]">

          {/* ── Header ── */}
          <div
            className="flex items-center justify-between h-9 px-3 bg-[#1a1028] select-none cursor-move flex-shrink-0"
            onMouseDown={handleHeaderMouseDown}
          >
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-sm">💬</span>
              <span className="text-white text-sm font-bold tracking-wide">
                {conversation.title}
              </span>
              {conversation.online && (
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                className="w-6 h-5 flex items-center justify-center text-pink-400/60 hover:text-pink-300 transition-colors border border-pink-500/30 rounded-sm"
                onClick={(e) => { e.stopPropagation(); closeMessengerWindow(); }}
              >
                <span className="text-[10px] font-bold">✕</span>
              </button>
            </div>
          </div>

          {/* ── Message List ── */}
          <div
            className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5 terminal-scrollbar"
            style={{
              background: "linear-gradient(135deg, rgba(20,15,40,0.95) 0%, rgba(15,25,45,0.98) 100%)",
            }}
          >
            {conversation.messages.map((msg, idx) => {
              const isFirst = idx === 0;
              return (
                <div key={msg.id} className="flex gap-2 items-start">
                  {/* Avatar for first message only */}
                  {isFirst ? (
                    <div className="flex-shrink-0 w-12 h-12 rounded-md bg-[#2a2040] border border-gray-600/50 flex items-center justify-center overflow-hidden mt-0.5">
                      {msg.senderAvatar ? (
                        <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-cover" style={{ imageRendering: "pixelated" }} />
                      ) : (
                        <span className="text-xl" style={{ imageRendering: "pixelated" }}>🤖</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-12" />
                  )}

                  {/* Message content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1">
                      <span className="text-blue-400 text-xs mt-0.5 flex-shrink-0">💬</span>
                      <p className="text-cyan-100 text-[13px] leading-relaxed break-words whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    </div>
                    {msg.timestampLabel && (
                      <p className="text-gray-500 text-[10px] mt-0.5 pl-5">{msg.timestampLabel}</p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messageEndRef} />
          </div>

          {/* ── Input area ── */}
          <div
            className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
            style={{
              background: "linear-gradient(to right, rgba(20,15,40,0.95), rgba(15,25,45,0.98))",
              borderTop: "1px solid rgba(0,255,255,0.1)",
            }}
          >
            <div className="flex-1 h-7 rounded-sm bg-[#0d0a18] border border-gray-700/50 px-2 flex items-center">
              <span className="text-gray-600 text-xs select-none">메시지 입력...</span>
            </div>
            <button className="w-6 h-6 flex items-center justify-center text-blue-400 hover:text-blue-300 transition-colors text-sm">
              🎤
            </button>
            <button className="w-7 h-7 flex items-center justify-center bg-cyan-600/80 hover:bg-cyan-500 rounded-sm transition-colors">
              <span className="text-white text-xs font-bold">➤</span>
            </button>
          </div>

          {/* ── Action buttons ── */}
          {conversation.actions && conversation.actions.length > 0 && (
            <div
              className="flex items-center justify-center gap-1 px-3 py-2 flex-shrink-0"
              style={{
                borderTop: "1px solid rgba(0,255,255,0.08)",
                background: "rgba(10,8,20,0.5)",
              }}
            >
              {conversation.actions.map((action, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-gray-600 text-[10px]">|</span>}
                  <button className="text-cyan-400 text-[11px] font-bold hover:text-cyan-300 transition-colors">
                    &lt;{action.label}&gt;
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
