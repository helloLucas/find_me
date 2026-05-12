import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { endingApi } from "../../shared/api/endingApi";
import type { EndingResultScene, EndingResultTone } from "../../shared/types/ending";

interface EndingResultOverlayProps {
  endingType: string | null;
}

const TONE_CLASSES: Record<EndingResultTone, { accent: string; border: string; glow: string }> = {
  lime: {
    accent: "text-lime-300",
    border: "border-lime-300/35",
    glow: "shadow-[0_0_46px_rgba(190,242,100,0.16)]",
  },
  cyan: {
    accent: "text-cyan-200",
    border: "border-cyan-300/35",
    glow: "shadow-[0_0_46px_rgba(103,232,249,0.15)]",
  },
  red: {
    accent: "text-red-300",
    border: "border-red-400/35",
    glow: "shadow-[0_0_46px_rgba(248,113,113,0.14)]",
  },
  violet: {
    accent: "text-violet-200",
    border: "border-violet-300/35",
    glow: "shadow-[0_0_46px_rgba(196,181,253,0.14)]",
  },
};

const DEFAULT_TONE = TONE_CLASSES.cyan;

export const EndingResultOverlay: React.FC<EndingResultOverlayProps> = ({ endingType }) => {
  const navigate = useNavigate();
  const [scene, setScene] = useState<EndingResultScene | null>(null);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    let ignore = false;

    setScene(null);
    setHasLoadError(false);

    if (!endingType) {
      setHasLoadError(true);
      return () => {
        ignore = true;
      };
    }

    endingApi
      .getResultScene(endingType)
      .then((nextScene) => {
        if (!ignore) {
          setScene(nextScene);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch ending result scene", error);
        if (!ignore) {
          setHasLoadError(true);
        }
      });

    return () => {
      ignore = true;
    };
  }, [endingType]);

  const tone = scene ? TONE_CLASSES[scene.tone] ?? DEFAULT_TONE : DEFAULT_TONE;

  const handlePrimaryAction = () => {
    navigate("/");
  };

  if (!scene) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black text-white select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(34,211,238,0.12),transparent_34%),linear-gradient(180deg,rgba(8,13,24,0.92),#020204_72%)]" />
        <section className="relative mx-6 w-full max-w-xl border border-cyan-200/20 bg-black/70 px-8 py-10 text-center shadow-[0_0_60px_rgba(8,145,178,0.18)] backdrop-blur-md">
          <p className="font-system-overlay text-xs tracking-[0.3em] text-cyan-100/60">
            {hasLoadError ? "엔딩 기록을 불러오지 못했습니다." : "엔딩 기록을 불러오는 중입니다."}
          </p>
          {hasLoadError && (
            <button
              onClick={handlePrimaryAction}
              className="mt-8 border border-cyan-200/35 bg-cyan-100/[0.04] px-7 py-3 font-system-overlay text-xs tracking-[0.18em] text-cyan-100 transition hover:border-cyan-100/80 hover:bg-cyan-100/12"
            >
              타이틀로 돌아가기
            </button>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#030508]/88 text-white backdrop-blur-[20px] select-none">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:100%_4px] opacity-45" />
      <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.08),transparent_30%)]" />

      <section
        className={`hud-fade-in relative mx-6 flex w-full max-w-2xl flex-col gap-10 border bg-black/58 px-8 py-10 backdrop-blur-md ${tone.border} ${tone.glow}`}
      >
        <div className="flex items-center justify-between font-system-overlay text-[10px] tracking-[0.3em] text-white/34">
          <span>{scene.headerLeft}</span>
          <span>{scene.headerRight}</span>
        </div>

        <div className="space-y-4 text-center">
          <p className={`font-system-overlay text-xs tracking-[0.42em] ${tone.accent}`}>
            {scene.classification}
          </p>
          <h1
            className={`font-system-overlay text-3xl leading-tight drop-shadow-[0_0_18px_rgba(255,255,255,0.16)] md:text-5xl ${tone.accent}`}
          >
            {scene.title}
          </h1>
          <p className="mx-auto max-w-xl font-desktop-ui text-sm leading-7 text-slate-300">
            {scene.headline}
          </p>
        </div>

        <div className="border border-white/10 bg-white/[0.025] px-5 py-4 font-terminal text-xs leading-6 text-slate-300">
          {scene.terminalLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={handlePrimaryAction}
            className={`border px-8 py-3 font-system-overlay text-xs tracking-[0.22em] transition hover:bg-white/10 ${tone.border} ${tone.accent}`}
          >
            {scene.primaryActionLabel}
          </button>
        </div>
      </section>
    </div>
  );
};
