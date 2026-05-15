import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { endingApi } from "../../shared/api/endingApi";
import type { EndingResultScene, EndingResultTone } from "../../shared/types/ending";
import "./style.css";

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
const OBSERVER_LOG_START_DELAY_MS = 760;
const OBSERVER_LOG_TYPE_INTERVAL_MS = 42;
const OBSERVER_LOG_LINE_PAUSE_MS = 320;
const OBSERVER_LOG_LABEL = "NX-OBS // SIGNAL RESIDUE // DETECTED";

export const EndingResultOverlay: React.FC<EndingResultOverlayProps> = ({ endingType }) => {
  const navigate = useNavigate();
  const [scene, setScene] = useState<EndingResultScene | null>(null);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [renderedTerminalLines, setRenderedTerminalLines] = useState<string[]>([]);
  const [isObserverLogComplete, setIsObserverLogComplete] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    let ignore = false;
    const timers: number[] = [];

    const schedule = (callback: () => void, delay = 0) => {
      timers.push(window.setTimeout(callback, delay));
    };

    schedule(() => {
      if (ignore) {
        return;
      }

      setScene(null);
      setHasLoadError(!endingType);
    });

    if (!endingType) {
      return () => {
        ignore = true;
        timers.forEach((timer) => window.clearTimeout(timer));
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
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [endingType]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);

    return () => {
      mediaQuery.removeEventListener("change", syncPreference);
    };
  }, []);

  useEffect(() => {
    if (!scene) {
      return;
    }

    const lines = scene.terminalLines ?? [];
    const timers: number[] = [];

    const schedule = (callback: () => void, delay: number) => {
      timers.push(window.setTimeout(callback, delay));
    };

    if (prefersReducedMotion) {
      schedule(() => {
        setRenderedTerminalLines(lines);
        setIsObserverLogComplete(true);
      }, 0);

      return () => {
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    const lineCharacters = lines.map((line) => Array.from(line));
    let lineIndex = 0;
    let characterIndex = 0;

    schedule(() => {
      setRenderedTerminalLines(lines.map(() => ""));
      setIsObserverLogComplete(false);
    }, 0);

    const typeNextCharacter = () => {
      const currentLine = lineCharacters[lineIndex];

      if (!currentLine) {
        setIsObserverLogComplete(true);
        return;
      }

      characterIndex += 1;

      setRenderedTerminalLines((previousLines) => {
        const nextLines = [...previousLines];
        nextLines[lineIndex] = currentLine.slice(0, characterIndex).join("");
        return nextLines;
      });

      if (characterIndex < currentLine.length) {
        schedule(typeNextCharacter, OBSERVER_LOG_TYPE_INTERVAL_MS);
        return;
      }

      lineIndex += 1;
      characterIndex = 0;

      if (lineIndex < lineCharacters.length) {
        schedule(typeNextCharacter, OBSERVER_LOG_LINE_PAUSE_MS);
        return;
      }

      schedule(() => setIsObserverLogComplete(true), OBSERVER_LOG_LINE_PAUSE_MS);
    };

    schedule(typeNextCharacter, OBSERVER_LOG_START_DELAY_MS);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [prefersReducedMotion, scene]);

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
        className={`hud-fade-in relative mx-6 flex w-full max-w-2xl flex-col gap-8 border bg-black/58 px-7 py-8 backdrop-blur-md md:px-8 md:py-10 ${tone.border} ${tone.glow}`}
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

        <div className="ending-observer-log terminal-retro-surface font-terminal" aria-label="observation log">
          <div className="ending-observer-log__header">
            <span className="ending-observer-log__label" data-text={OBSERVER_LOG_LABEL}>
              {OBSERVER_LOG_LABEL}
            </span>
            <span className="ending-observer-log__status">LOCKED TRACE</span>
          </div>

          <div className="ending-observer-log__body">
            {scene.terminalLines.map((line, index) => (
              <p className="ending-observer-log__line" key={`${line}-${index}`}>
                {renderedTerminalLines[index] ?? ""}
              </p>
            ))}
            <span
              className={`ending-observer-log__cursor ${
                isObserverLogComplete ? "ending-observer-log__cursor--settled" : ""
              }`}
            />
          </div>
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
