import React from "react";
import { useMessengerStore } from "../../app/store/messengerStore";

export const MessengerNotificationCard: React.FC = () => {
  const { conversation, isNotificationVisible, isUnread, openMessengerWindow } =
    useMessengerStore();

  if (!isNotificationVisible || !conversation) return null;

  const preview = conversation.messages[0] ?? null;
  if (!preview) return null;

  // Truncate preview
  const maxLen = 18;
  const previewText =
    preview.text.length > maxLen
      ? preview.text.slice(0, maxLen) + "… <더 보기>"
      : preview.text;

  return (
    <div
      className="fixed bottom-14 right-4 z-[1500] cursor-pointer select-none"
      onClick={openMessengerWindow}
    >
      {/* Outer frame with neon glow */}
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
        {/* Inner card */}
        <div className="rounded-[5px] overflow-hidden bg-[#1a1028]">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#1a1028]">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-base">💬</span>
              <span className="text-white text-sm font-bold tracking-wide">
                {conversation.title}
              </span>
              {conversation.online && (
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              )}
            </div>
            <div className="flex items-center gap-1">
              <button className="w-6 h-5 flex items-center justify-center text-pink-400/60 hover:text-pink-300 transition-colors border border-pink-500/30 rounded-sm">
                <span className="text-[10px]">□</span>
              </button>
              <button className="w-6 h-5 flex items-center justify-center text-pink-400/60 hover:text-pink-300 transition-colors border border-pink-500/30 rounded-sm">
                <span className="text-[10px] font-bold">✕</span>
              </button>
            </div>
          </div>

          {/* Message body */}
          <div
            className="mx-2 mb-2 px-3 py-3 rounded-md flex gap-3 items-start"
            style={{
              background: "linear-gradient(135deg, rgba(30,20,60,0.9) 0%, rgba(20,30,50,0.95) 100%)",
              border: "1px solid rgba(0,255,255,0.1)",
              boxShadow: "inset 0 0 20px rgba(0,255,255,0.03)",
            }}
          >
            {/* Avatar */}
            <div className="flex-shrink-0 w-14 h-14 rounded-md bg-[#2a2040] border border-gray-600/50 flex items-center justify-center overflow-hidden">
              {preview.senderAvatar ? (
                <img src={preview.senderAvatar} alt={preview.senderName} className="w-full h-full object-cover" style={{ imageRendering: "pixelated" }} />
              ) : (
                <span className="text-2xl" style={{ imageRendering: "pixelated" }}>🤖</span>
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-cyan-200 text-sm font-bold leading-snug break-words">
                {previewText}
              </p>
              {preview.timestampLabel && (
                <p className="text-gray-400 text-xs mt-1.5">{preview.timestampLabel}</p>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-1 px-3 pb-2.5 pt-0.5">
            <span className="text-cyan-400 text-xs font-bold hover:text-cyan-300 transition-colors cursor-pointer">
              &lt;답장하기&gt;
            </span>
            <span className="text-gray-500 text-xs">|</span>
            <span className="text-cyan-400 text-xs font-bold hover:text-cyan-300 transition-colors cursor-pointer">
              &lt;나중에 보기&gt;
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
