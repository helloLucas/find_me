import React, { useEffect, useMemo, useState } from "react";
import { useCallOverlayStore } from "../../../app/store/callOverlayStore";
import { DESKTOP_LAYER } from "../../../shared/config/desktopWindows";
import { useStoryRuntimeStore } from "../storyRuntime.store";

export const CallOverlay: React.FC = () => {
  const { isVisible, isRinging, nodeCode, messages, buttons } = useCallOverlayStore();
  const { isLoading, submitStoryClick } = useStoryRuntimeStore();
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    setMessageIndex(0);
  }, [nodeCode, messages.length]);

  const currentMessage = useMemo(() => messages[messageIndex], [messages, messageIndex]);
  const hasMoreMessages = messageIndex < messages.length - 1;
  const primaryButton = buttons[0];
  const canCompleteCall = !hasMoreMessages && Boolean(primaryButton);

  if (!isVisible) return null;

  const handleAdvance = () => {
    if (isLoading || isRinging) return;

    if (hasMoreMessages) {
      setMessageIndex((index) => Math.min(index + 1, messages.length - 1));
      return;
    }

    if (primaryButton) {
      void submitStoryClick(primaryButton.value);
    }
  };

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleAdvance();
  };

  const isNotice = currentMessage?.channel === "terminal_notice";
  const speaker = currentMessage?.speaker || "LUCAS";
  const line = currentMessage?.text ?? "";

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-black/80 font-desktop-ui text-cyan-50"
      style={{ zIndex: DESKTOP_LAYER.overlay }}
      aria-live="polite"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.14),transparent_34%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[length:auto,100%_4px]" />

      <div className="pointer-events-none absolute inset-x-0 top-0 bottom-[208px] flex items-center justify-center sm:bottom-[258px]">
        <div className="relative flex h-[34vh] min-h-[220px] w-[min(68vw,560px)] items-center justify-center">
          <div className="absolute h-[min(52vw,390px)] w-[min(52vw,390px)] rounded-full border border-cyan-200/10" />
          <div className="absolute h-[min(42vw,310px)] w-[min(42vw,310px)] animate-ping rounded-full border border-cyan-300/30" />
          <div className="absolute h-[min(31vw,230px)] w-[min(31vw,230px)] animate-pulse rounded-full border border-cyan-100/50 shadow-[0_0_40px_rgba(103,232,249,0.28)]" />
          <div className="absolute h-[min(18vw,132px)] w-[min(18vw,132px)] rounded-full border border-white/20 bg-cyan-200/10 shadow-[0_0_34px_rgba(34,211,238,0.42)]" />

          <div className="relative flex h-20 w-56 items-center justify-center gap-1.5 overflow-hidden">
            {Array.from({ length: 17 }).map((_, index) => (
              <span
                key={index}
                className="block w-1 rounded-full bg-cyan-100/70 shadow-[0_0_10px_rgba(165,243,252,0.72)]"
                style={{
                  height: `${18 + Math.abs(8 - index) * 3}px`,
                  animation: `callSignalPulse ${1.1 + (index % 4) * 0.12}s ease-in-out infinite`,
                  animationDelay: `${index * 0.045}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 px-3 pb-4 sm:px-8 sm:pb-8">
        <div
          role="button"
          tabIndex={0}
          aria-label="call dialog"
          onClick={handleAdvance}
          onKeyDown={handleDialogKeyDown}
          className={`relative mx-auto min-h-[176px] w-full max-w-5xl cursor-pointer overflow-hidden border bg-[#061018]/94 px-5 py-4 shadow-[0_-10px_44px_rgba(0,0,0,0.46),0_0_34px_rgba(34,211,238,0.18)] outline-none transition sm:min-h-[210px] sm:px-8 sm:py-6 ${
            isLoading ? "cursor-wait opacity-70" : "hover:border-cyan-100/70"
          } ${
            isNotice
              ? "border-red-300/50 text-red-50"
              : "border-cyan-200/55 text-cyan-50"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(34,211,238,0.08),transparent_18%,transparent_82%,rgba(217,70,239,0.08))]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/70 to-transparent" />

          <div className="relative flex h-full flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div
                className={`border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] sm:text-sm ${
                  isNotice
                    ? "border-red-300/45 bg-red-500/10 text-red-100"
                    : "border-cyan-200/45 bg-cyan-300/10 text-cyan-100"
                }`}
              >
                {isRinging ? "INCOMING CALL" : (isNotice ? "SIGNAL NOTICE" : speaker)}
              </div>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((item) => (
                  <span
                    key={item}
                    className="h-1.5 w-1.5 rounded-full bg-cyan-100/70"
                    style={{
                      animation: "callSignalPulse 1.2s ease-in-out infinite",
                      animationDelay: `${item * 0.16}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            <p
              className={`min-h-[82px] whitespace-pre-wrap break-keep text-left text-[17px] leading-[1.75] sm:min-h-[104px] sm:text-[21px] ${
                isNotice ? "font-terminal text-red-100" : "text-cyan-50"
              }`}
            >
              {isRinging ? "" : line}
            </p>

            <div className="flex justify-end">
              <div
                className={`text-2xl leading-none text-cyan-100/80 ${
                  canCompleteCall ? "text-red-200" : ""
                }`}
              >
                ▼
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes callSignalPulse {
          0%, 100% { opacity: 0.35; transform: scaleY(0.58); }
          50% { opacity: 1; transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
};
