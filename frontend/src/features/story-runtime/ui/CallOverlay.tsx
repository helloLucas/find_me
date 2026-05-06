import React, { useEffect, useMemo, useState } from "react";
import { useCallOverlayStore } from "../../../app/store/callOverlayStore";
import { DESKTOP_LAYER } from "../../../shared/config/desktopWindows";
import { useStoryRuntimeStore } from "../storyRuntime.store";

export const CallOverlay: React.FC = () => {
  const {
    isVisible,
    nodeCode,
    title,
    status,
    messages,
    buttons,
  } = useCallOverlayStore();
  const { isLoading, submitStoryClick } = useStoryRuntimeStore();
  const [visibleMessageCount, setVisibleMessageCount] = useState(1);

  useEffect(() => {
    setVisibleMessageCount(messages.length > 0 ? 1 : 0);
  }, [nodeCode, messages.length]);

  const visibleMessages = useMemo(
    () => messages.slice(0, visibleMessageCount),
    [messages, visibleMessageCount]
  );
  const hasMoreMessages = visibleMessageCount < messages.length;
  const canShowButtons = !hasMoreMessages && buttons.length > 0;

  if (!isVisible) return null;

  const handleAdvance = () => {
    if (hasMoreMessages) {
      setVisibleMessageCount((count) => Math.min(count + 1, messages.length));
    }
  };

  const handlePromptAction = (value: string) => {
    if (!value || isLoading) return;
    void submitStoryClick(value);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/70 px-4 font-desktop-ui"
      style={{ zIndex: DESKTOP_LAYER.overlay }}
      aria-live="polite"
    >
      <div className="w-full max-w-[520px] overflow-hidden rounded-lg border border-cyan-300/70 bg-[#05080d] shadow-[0_0_32px_rgba(0,255,255,0.22),0_0_80px_rgba(255,62,207,0.12)]">
        <div className="flex items-center justify-between border-b border-cyan-300/30 bg-[#101520] px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-cyan-100">{title || "INCOMING CALL"}</div>
            <div className="mt-1 text-[11px] uppercase text-cyan-300/70">
              {status || "connected"}
            </div>
          </div>
          <div className="h-3 w-3 flex-shrink-0 rounded-full bg-red-400 shadow-[0_0_14px_rgba(248,113,113,0.9)]" />
        </div>

        <div className="space-y-3 px-4 py-5">
          {visibleMessages.map((message, index) => {
            const isNotice = message.channel === "terminal_notice";

            if (isNotice) {
              return (
                <div
                  key={`${message.channel}-${index}`}
                  className="rounded-md border border-red-400/40 bg-red-950/50 px-3 py-2 text-center font-terminal text-xs text-red-100"
                >
                  {message.text}
                </div>
              );
            }

            return (
              <div key={`${message.channel}-${index}`} className="flex flex-col gap-1">
                <div className="text-xs font-bold text-cyan-300">{message.speaker}</div>
                <div className="rounded-md border border-cyan-300/20 bg-cyan-950/30 px-3 py-3 text-sm leading-relaxed text-cyan-50 shadow-[inset_0_0_18px_rgba(0,255,255,0.04)]">
                  {message.text}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 border-t border-cyan-300/20 bg-[#070b12] px-4 py-3">
          {hasMoreMessages && (
            <button
              type="button"
              className="rounded-md border border-cyan-300/60 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleAdvance}
              disabled={isLoading}
            >
              다음
            </button>
          )}

          {canShowButtons &&
            buttons.map((button) => (
              <button
                key={button.value}
                type="button"
                className="rounded-md border border-fuchsia-300/70 bg-fuchsia-400/10 px-4 py-2 text-sm font-bold text-fuchsia-50 transition hover:bg-fuchsia-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => handlePromptAction(button.value)}
                disabled={isLoading}
              >
                {button.label}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};
