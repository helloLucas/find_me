import React, { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWindowStore } from "../../../app/store/windowStore";
import type { DesktopWindowId } from "../../../shared/config/desktopWindows";
import { fragmentApi } from "../../../shared/api/fragmentApi";
import { audioManager } from "../../story-runtime/audioManager";

const BGM_URL = "https://djbod0nv85jx9.cloudfront.net/audios/minigame_2_v1.mp3";
const INITIAL_NEEDLE_POSITION = 8;

const ROUNDS = [
  { label: "ROUND 1", width: 26, speed: 0.07 },
  { label: "ROUND 2", width: 18, speed: 0.09 },
  { label: "ROUND 3", width: 12, speed: 0.115 },
  { label: "ROUND 4", width: 8, speed: 0.145 },
  { label: "ROUND 5", width: 5, speed: 0.16 },
] as const;
const CLEAR_FRAGMENT_CODE = "2";
const MIN_CLEAR_HITS = 3;
const FIREWORK_BURSTS = [
  { left: "18%", top: "24%", color: "#facc15", delay: "0ms" },
  { left: "50%", top: "15%", color: "#67e8f9", delay: "180ms" },
  { left: "80%", top: "27%", color: "#f0abfc", delay: "340ms" },
  { left: "28%", top: "67%", color: "#fb7185", delay: "520ms" },
  { left: "70%", top: "70%", color: "#bef264", delay: "700ms" },
] as const;
const FIREWORK_PARTICLES = Array.from({ length: 18 }, (_, index) => {
  const angle = (index / 18) * Math.PI * 2;
  const distance = 58 + (index % 4) * 16;

  return {
    x: `${Math.cos(angle) * distance}px`,
    y: `${Math.sin(angle) * distance}px`,
    size: 4 + (index % 3),
    delay: `${(index % 6) * 26}ms`,
  };
});
const FIREWORK_STYLES = `
@keyframes maple-firework-particle {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.18);
  }
  12% {
    opacity: 1;
  }
  78% {
    opacity: 1;
    transform: translate(calc(-50% + var(--firework-x)), calc(-50% + var(--firework-y))) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--firework-x)), calc(-50% + var(--firework-y))) scale(0.15);
  }
}

@keyframes maple-firework-core {
  0%, 100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.2);
  }
  14% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.6);
  }
  42% {
    opacity: 0.7;
    transform: translate(-50%, -50%) scale(0.75);
  }
}

@keyframes maple-perfect-glow {
  0%, 100% {
    text-shadow: 0 0 16px rgba(250, 204, 21, 0.55), 0 0 34px rgba(103, 232, 249, 0.25);
  }
  50% {
    text-shadow: 0 0 26px rgba(250, 204, 21, 0.95), 0 0 52px rgba(240, 171, 252, 0.5);
  }
}
`;

type Phase = "intro" | "playing" | "finished";
type ResultTone = "perfect" | "clear" | "failed";
type FireworkParticleStyle = CSSProperties & {
  "--firework-x": string;
  "--firework-y": string;
  "--firework-color": string;
};

interface AttemptLog {
  id: number;
  round: number;
  hit: boolean;
  position: number;
  zoneStart: number;
  zoneEnd: number;
}

interface StarforceTabProps {
  windowId?: DesktopWindowId;
  isPractice?: boolean;
}

function getSuccessZone(roundIndex: number) {
  const width = ROUNDS[roundIndex]?.width ?? ROUNDS[0].width;
  const start = (100 - width) / 2;

  return {
    start,
    end: start + width,
    width,
  };
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function getResultTone(hits: number): ResultTone {
  if (hits >= ROUNDS.length) return "perfect";
  if (hits >= MIN_CLEAR_HITS) return "clear";
  return "failed";
}

const RESULT_COPY: Record<ResultTone, {
  eyebrow: string;
  title: string;
  summary: string;
  detail: string;
}> = {
  perfect: {
    eyebrow: "ALL FIVE LOCKED",
    title: "PERFECT CLEAR",
    summary: "완벽한 성공",
    detail: "5라운드 전부 성공했습니다. 축하합니다.",
  },
  clear: {
    eyebrow: "CLEAR THRESHOLD MET",
    title: "SYNC COMPLETE",
    summary: "성공",
    detail: "성공입니다. 기준 라운드를 넘겼습니다.",
  },
  failed: {
    eyebrow: "SYNC REJECTED",
    title: "SYNC FAILED",
    summary: "실패",
    detail: "성공 기준은 5라운드 중 3라운드입니다. 다시 시도해서 안정 범위 안에 맞춰야 합니다.",
  },
};

function PerfectFireworks() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{FIREWORK_STYLES}</style>
      {FIREWORK_BURSTS.map((burst, burstIndex) => (
        <div
          key={`${burst.left}-${burst.top}`}
          className="absolute"
          style={{ left: burst.left, top: burst.top }}
        >
          <span
            className="absolute h-5 w-5 rounded-full"
            style={{
              animation: "maple-firework-core 1400ms ease-out infinite",
              animationDelay: burst.delay,
              backgroundColor: burst.color,
              boxShadow: `0 0 26px ${burst.color}`,
            }}
          />
          {FIREWORK_PARTICLES.map((particle, particleIndex) => {
            const style: FireworkParticleStyle = {
              "--firework-x": particle.x,
              "--firework-y": particle.y,
              "--firework-color": burst.color,
              animation: "maple-firework-particle 1400ms cubic-bezier(0.13, 0.72, 0.22, 1) infinite",
              animationDelay: `calc(${burst.delay} + ${particle.delay})`,
              backgroundColor: "var(--firework-color)",
              boxShadow: `0 0 14px ${burst.color}`,
              height: particle.size,
              left: 0,
              top: 0,
              width: particle.size,
            };

            return (
              <span
                key={`${burstIndex}-${particleIndex}`}
                className="absolute rounded-full"
                style={style}
              />
            );
          })}
        </div>
      ))}
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-yellow-200/60 to-transparent opacity-70" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-cyan-200/50 to-transparent opacity-60" />
    </div>
  );
}

export const StarforceTab: React.FC<StarforceTabProps> = ({ windowId, isPractice }) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [hits, setHits] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [lastLog, setLastLog] = useState<AttemptLog | null>(null);
  const [logs, setLogs] = useState<AttemptLog[]>([]);
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const maximizeWindow = useWindowStore((state) => state.maximizeWindow);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousBgmNameRef = useRef<string | null>(null);
  const hasSuspendedStoryBgmRef = useRef(false);
  const needleRef = useRef<HTMLDivElement | null>(null);
  const positionRef = useRef(INITIAL_NEEDLE_POSITION);
  const directionRef = useRef<1 | -1>(1);
  const phaseRef = useRef<Phase>("intro");
  const roundIndexRef = useRef(0);
  const hitsRef = useRef(0);
  const inputLockRef = useRef(false);
  const lockTimeoutRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const hasRecordedClearRef = useRef(false);

  const zone = getSuccessZone(roundIndex);
  const zoneSummary = ROUNDS.map((round) => `${round.width}%`).join(" / ");
  const resultTone = getResultTone(hits);
  const resultCopy = RESULT_COPY[resultTone];
  const isPerfect = resultTone === "perfect";
  const isClear = resultTone !== "failed";

  const setNeedlePosition = useCallback((position: number) => {
    positionRef.current = position;
    if (needleRef.current) {
      needleRef.current.style.left = `${position}%`;
    }
  }, []);

  const resetNeedle = useCallback(() => {
    directionRef.current = 1;
    lastFrameTimeRef.current = null;
    setNeedlePosition(INITIAL_NEEDLE_POSITION);
  }, [setNeedlePosition]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    roundIndexRef.current = roundIndex;
  }, [roundIndex]);

  useEffect(() => {
    hitsRef.current = hits;
  }, [hits]);

  useEffect(() => {
    const tick = (time: number) => {
      const previousTime = lastFrameTimeRef.current ?? time;
      const delta = Math.min(32, time - previousTime);
      lastFrameTimeRef.current = time;

      if (phaseRef.current === "playing") {
        const currentRound = ROUNDS[roundIndexRef.current] ?? ROUNDS[0];
        let nextPosition = positionRef.current + directionRef.current * currentRound.speed * delta;

        if (nextPosition >= 100) {
          nextPosition = 100 - (nextPosition - 100);
          directionRef.current = -1;
        } else if (nextPosition <= 0) {
          nextPosition = -nextPosition;
          directionRef.current = 1;
        }

        setNeedlePosition(nextPosition);
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [setNeedlePosition]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;

      if (hasSuspendedStoryBgmRef.current && previousBgmNameRef.current) {
        audioManager.playBgm(previousBgmNameRef.current);
      }

      if (lockTimeoutRef.current !== null) {
        window.clearTimeout(lockTimeoutRef.current);
      }
    };
  }, []);

  // Record Clear
  useEffect(() => {
    if (phase === "finished" && isClear && !isPractice && !hasRecordedClearRef.current && gameSessionId) {
      hasRecordedClearRef.current = true;
      void fragmentApi.acquireFragment(CLEAR_FRAGMENT_CODE, gameSessionId).catch(err => {
        console.error("Failed to record starforce clear:", err);
        hasRecordedClearRef.current = false;
      });
    }
  }, [phase, isClear, isPractice, gameSessionId]);

  const playBgm = useCallback(() => {
    if (!hasSuspendedStoryBgmRef.current) {
      previousBgmNameRef.current = audioManager.getCurrentBgmName();
      audioManager.stopBgm();
      hasSuspendedStoryBgmRef.current = true;
    }

    if (!audioRef.current) {
      const audio = new Audio(BGM_URL);
      audio.loop = true;
      audio.volume = 0.42;
      audioRef.current = audio;
    }

    audioRef.current.play().catch(() => { });
  }, []);

  const recordClearIfNeeded = useCallback((finalHits: number) => {
    if (finalHits < MIN_CLEAR_HITS || hasRecordedClearRef.current || isPractice || !gameSessionId) return;

    hasRecordedClearRef.current = true;
    void fragmentApi.acquireFragment(CLEAR_FRAGMENT_CODE, gameSessionId).catch((error) => {
      hasRecordedClearRef.current = false;
      console.error("Failed to record minigame 2 clear:", error);
    });
  }, [isPractice, gameSessionId]);

  const startGame = useCallback(async () => {
    if (windowId) {
      maximizeWindow(windowId);
    }

    if (!isPractice) {
      try {
        const res = await fragmentApi.startMinigame(CLEAR_FRAGMENT_CODE);
        setGameSessionId(res);
      } catch (error) {
        console.error("Failed to start minigame session:", error);
        return;
      }
    }

    setPhase("playing");
    setRoundIndex(0);
    roundIndexRef.current = 0;
    setHits(0);
    hitsRef.current = 0;
    setAttempts(0);
    setLastLog(null);
    setLogs([]);
    inputLockRef.current = false;
    hasRecordedClearRef.current = false;
    resetNeedle();
    playBgm();
  }, [maximizeWindow, playBgm, resetNeedle, windowId, isPractice]);

  const restartGame = () => {
    startGame();
  };

  const unlockInputSoon = () => {
    if (lockTimeoutRef.current !== null) {
      window.clearTimeout(lockTimeoutRef.current);
    }

    lockTimeoutRef.current = window.setTimeout(() => {
      inputLockRef.current = false;
      lockTimeoutRef.current = null;
    }, 120);
  };

  const submitAttempt = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    if (inputLockRef.current) return;

    inputLockRef.current = true;

    const currentRoundIndex = roundIndexRef.current;
    const currentZone = getSuccessZone(currentRoundIndex);
    const position = positionRef.current;
    const hit = position >= currentZone.start && position <= currentZone.end;
    const log: AttemptLog = {
      id: performance.now(),
      round: currentRoundIndex + 1,
      hit,
      position,
      zoneStart: currentZone.start,
      zoneEnd: currentZone.end,
    };

    setAttempts((currentAttempts) => currentAttempts + 1);
    setLastLog(log);
    setLogs((currentLogs) => [log, ...currentLogs].slice(0, ROUNDS.length));

    const finalHits = hitsRef.current + (hit ? 1 : 0);
    if (hit) {
      hitsRef.current = finalHits;
      setHits(finalHits);
    }

    if (currentRoundIndex >= ROUNDS.length - 1) {
      setPhase("finished");
      phaseRef.current = "finished";
      recordClearIfNeeded(finalHits);
      unlockInputSoon();
      return;
    }

    const nextRoundIndex = currentRoundIndex + 1;
    roundIndexRef.current = nextRoundIndex;
    setRoundIndex(nextRoundIndex);
    resetNeedle();
    unlockInputSoon();
  }, [recordClearIfNeeded, resetNeedle]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      if (event.repeat) return;

      event.preventDefault();
      event.stopPropagation();

      if (phaseRef.current === "finished") {
        startGame();
        return;
      }

      submitAttempt();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [startGame, submitAttempt]);

  const handleAttemptPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    submitAttempt();
  };

  if (phase === "intro") {
    return (
      <div className="h-full w-full overflow-hidden bg-[#06070c] text-white font-pixel select-none">
        <div className="h-full w-full bg-[radial-gradient(circle_at_30%_10%,rgba(250,204,21,0.14),transparent_28%),radial-gradient(circle_at_82%_72%,rgba(34,211,238,0.14),transparent_34%)]">
          <div className="mx-auto flex h-full max-w-5xl flex-col justify-center px-8 py-8">
            <div className="mb-4 text-xs tracking-[0.35em] text-cyan-200/70">TERMINAL 2</div>
            <h1 className="mb-4 text-4xl font-bold tracking-widest text-yellow-200 drop-shadow-[0_0_18px_rgba(250,204,21,0.45)]">
              CORE TIMING
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-200/80">
              중앙 안정 구간에 바늘이 들어오는 순간 입력하세요. 총 5라운드이며,
              라운드가 올라갈수록 성공 범위가 좁아집니다.
            </p>

            <div className="mt-8 grid max-w-3xl grid-cols-3 gap-3 text-xs text-slate-200/80">
              <div className="border border-cyan-300/25 bg-black/35 p-4">
                <div className="mb-2 text-cyan-200">ROUNDS</div>
                <div>5 timing checks</div>
              </div>
              <div className="border border-yellow-300/25 bg-black/35 p-4">
                <div className="mb-2 text-yellow-200">INPUT</div>
                <div>Click or Space</div>
              </div>
              <div className="border border-fuchsia-300/25 bg-black/35 p-4">
                <div className="mb-2 text-fuchsia-200">ZONE</div>
                <div>{zoneSummary}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={startGame}
              className="mt-8 h-12 w-48 border-2 border-yellow-200 bg-yellow-300 text-black shadow-[0_0_18px_rgba(250,204,21,0.35)] transition hover:bg-yellow-100 active:translate-y-px"
            >
              PLAY
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#06080d] text-slate-100 font-pixel select-none">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:36px_36px] opacity-30" />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-5 py-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <div className="text-[10px] tracking-[0.35em] text-cyan-200/60">TERMINAL 2</div>
            <div className="mt-1 text-xl tracking-widest text-yellow-100">CORE TIMING</div>
          </div>
          <div className="flex items-center gap-4 text-right text-xs">
            <div>
              <div className="text-slate-400">ROUND</div>
              <div className="text-cyan-200">{Math.min(roundIndex + 1, ROUNDS.length)} / {ROUNDS.length}</div>
            </div>
            <div>
              <div className="text-slate-400">HITS</div>
              <div className="text-yellow-200">{hits} / {ROUNDS.length}</div>
            </div>
            <div>
              <div className="text-slate-400">INPUTS</div>
              <div className="text-fuchsia-200">{attempts}</div>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,1fr)_minmax(220px,320px)] gap-4 py-4">
          <div className="flex min-h-0 flex-col justify-center">
            <div className="mb-5 flex justify-center gap-3">
              {ROUNDS.map((round, index) => {
                const completed = logs.some((log) => log.round === index + 1);
                const hit = logs.some((log) => log.round === index + 1 && log.hit);
                const active = phase === "playing" && index === roundIndex;

                return (
                  <div
                    key={round.label}
                    className={`flex h-12 w-28 flex-col items-center justify-center border text-[10px] ${hit
                      ? "border-yellow-200 bg-yellow-300 text-black shadow-[0_0_14px_rgba(250,204,21,0.4)]"
                      : completed
                        ? "border-red-300 bg-red-950/50 text-red-200"
                        : active
                          ? "border-cyan-200 bg-cyan-950/45 text-cyan-100"
                          : "border-slate-600 bg-black/35 text-slate-500"
                      }`}
                  >
                    <span>{round.label}</span>
                    <span>{round.width}%</span>
                  </div>
                );
              })}
            </div>

            <div className="mx-auto w-full max-w-2xl border border-cyan-300/25 bg-black/45 p-4 shadow-[0_0_24px_rgba(34,211,238,0.12)]">
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="text-cyan-200">{ROUNDS[roundIndex]?.label ?? "RESULT"}</span>
                <span className="text-yellow-200">SUCCESS ZONE {formatPercent(zone.width)}</span>
              </div>

              <div className="relative h-12 border border-white/15 bg-slate-950">
                <div
                  className="absolute inset-y-0 bg-yellow-300/22 shadow-[0_0_20px_rgba(250,204,21,0.28)]"
                  style={{ left: `${zone.start}%`, width: `${zone.width}%` }}
                />
                <div
                  ref={needleRef}
                  className="absolute top-0 h-full w-1 bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.85)]"
                  style={{ left: `${INITIAL_NEEDLE_POSITION}%` }}
                />
              </div>

              <button
                type="button"
                onPointerDown={handleAttemptPointerDown}
                disabled={phase !== "playing"}
                className={`mt-4 h-12 w-full border-2 text-sm tracking-widest transition ${phase === "playing"
                  ? "border-yellow-200 bg-yellow-300 text-black hover:bg-yellow-100 active:translate-y-px"
                  : "border-slate-700 bg-slate-900 text-slate-500"
                  }`}
              >
                ATTEMPT
              </button>

              <div className="mt-3 text-center text-[10px] leading-5 text-slate-400">
                Press Space or click Attempt when the needle enters the gold zone.
              </div>
            </div>

            {lastLog && (
              <div
                className={`mx-auto mt-4 w-full max-w-2xl border px-4 py-3 text-center text-xs ${lastLog.hit
                  ? "border-yellow-200/35 bg-yellow-950/30 text-yellow-100"
                  : "border-red-300/35 bg-red-950/30 text-red-100"
                  }`}
              >
                {lastLog.hit ? "SYNC HIT" : "SYNC MISS"} · Round {lastLog.round} · Needle {formatPercent(lastLog.position)}
              </div>
            )}
          </div>

          <aside className="min-h-0 overflow-hidden border border-white/10 bg-black/35 p-4">
            <div className="mb-4 text-sm text-cyan-200">ROUND DATA</div>
            <div className="space-y-3 text-xs">
              {ROUNDS.map((round, index) => {
                const roundZone = getSuccessZone(index);
                return (
                  <div key={round.label} className="border border-white/10 bg-black/25 px-3 py-3">
                    <div className="mb-2 flex justify-between gap-3">
                      <span className="text-slate-300">{round.label}</span>
                      <span className="text-yellow-200">{round.width}%</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Window {formatPercent(roundZone.start)} - {formatPercent(roundZone.end)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="mb-3 text-sm text-fuchsia-200">INPUT LOG</div>
              <div className="space-y-2 text-[10px] text-slate-300">
                {logs.length === 0 ? (
                  <div className="text-slate-500">No input yet.</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="border border-white/10 bg-black/30 px-2 py-2">
                      <span className="text-slate-500">R{log.round}</span>{" "}
                      <span className={log.hit ? "text-yellow-200" : "text-red-300"}>
                        {log.hit ? "HIT" : "MISS"}
                      </span>{" "}
                      <span className="text-slate-500">@ {formatPercent(log.position)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {phase === "finished" && (
        <div className={`absolute inset-0 z-30 flex items-center justify-center px-6 ${isPerfect
          ? "bg-[#030207]/92"
          : isClear
            ? "bg-emerald-950/88"
            : "bg-red-950/88"
          }`}>
          {isPerfect && <PerfectFireworks />}
          <div className={`pointer-events-none absolute inset-0 ${isPerfect
            ? "bg-[radial-gradient(circle_at_50%_45%,rgba(250,204,21,0.16),transparent_38%)]"
            : isClear
              ? "bg-[radial-gradient(circle_at_50%_45%,rgba(34,197,94,0.22),transparent_38%)]"
              : "bg-[radial-gradient(circle_at_50%_45%,rgba(239,68,68,0.26),transparent_38%)]"
            }`} />
          <div className={`relative z-10 w-full text-center shadow-[0_0_40px_rgba(0,0,0,0.55)] ${isPerfect
            ? "max-w-2xl border-2 border-yellow-200/70 bg-[#0d0a14]/90 p-10 shadow-[0_0_54px_rgba(250,204,21,0.32)]"
            : isClear
              ? "max-w-xl border-2 border-emerald-300/70 bg-[#06140d]/92 p-8 shadow-[0_0_44px_rgba(16,185,129,0.26)]"
              : "max-w-xl border-2 border-red-300/70 bg-[#16080b]/92 p-8 shadow-[0_0_44px_rgba(239,68,68,0.28)]"
            }`}>
            <div className={`mb-3 text-xs tracking-[0.42em] ${isPerfect ? "text-fuchsia-200" : isClear ? "text-emerald-200" : "text-red-200"}`}>
              {resultCopy.eyebrow}
            </div>
            <div className={`mb-4 tracking-widest ${isPerfect
              ? "text-5xl text-yellow-100 [animation:maple-perfect-glow_1200ms_ease-in-out_infinite]"
              : isClear
                ? "text-4xl text-emerald-200 drop-shadow-[0_0_18px_rgba(52,211,153,0.55)]"
                : "text-4xl text-red-200 drop-shadow-[0_0_18px_rgba(248,113,113,0.55)]"
              }`}>
              {resultCopy.title}
            </div>
            <div className="mx-auto mb-5 flex max-w-sm justify-center gap-2">
              {ROUNDS.map((round, index) => {
                const log = logs.find((roundLog) => roundLog.round === index + 1);
                return (
                  <div
                    key={round.label}
                    className={`flex h-10 w-10 items-center justify-center border text-xs ${log?.hit
                      ? isPerfect
                        ? "border-yellow-200 bg-yellow-300 text-black shadow-[0_0_16px_rgba(250,204,21,0.45)]"
                        : "border-emerald-200 bg-emerald-300 text-black shadow-[0_0_14px_rgba(52,211,153,0.36)]"
                      : "border-red-300 bg-red-950 text-red-100"
                      }`}
                  >
                    {log?.hit ? "HIT" : "MISS"}
                  </div>
                );
              })}
            </div>
            <div className={`mx-auto mb-4 max-w-xs border px-4 py-2 text-sm tracking-widest ${isPerfect
              ? "border-yellow-200/50 bg-yellow-300/10 text-yellow-100"
              : isClear
                ? "border-emerald-200/50 bg-emerald-300/10 text-emerald-100"
                : "border-red-200/50 bg-red-300/10 text-red-100"
              }`}>
              {resultCopy.summary}
            </div>
            <p className="mx-auto max-w-md text-sm leading-6 text-slate-300">
              총 5라운드 중 {hits}라운드를 성공했습니다. 성공 기준은 {MIN_CLEAR_HITS}라운드입니다.
            </p>
            <div className={`mx-auto mt-6 max-w-md border px-5 py-4 text-sm leading-6 ${isPerfect
              ? "border-yellow-200/50 bg-yellow-300/10 text-yellow-100 shadow-[0_0_24px_rgba(250,204,21,0.2)]"
              : isClear
                ? "border-emerald-200/45 bg-emerald-300/10 text-emerald-100 shadow-[0_0_22px_rgba(52,211,153,0.16)]"
                : "border-red-200/45 bg-red-300/10 text-red-100 shadow-[0_0_22px_rgba(248,113,113,0.16)]"
              }`}>
              {isPractice && isClear ? "아케이드 모드 클리어! 기록은 저장되지 않습니다." : resultCopy.detail}
            </div>
            {!isClear && (
              <div className="mx-auto mt-4 grid max-w-md grid-cols-3 gap-2 text-[10px] text-red-100/80">
                <div className="border border-red-200/30 bg-black/20 px-2 py-2">
                  REQUIRED
                  <div className="mt-1 text-red-100">{MIN_CLEAR_HITS} HIT</div>
                </div>
                <div className="border border-red-200/30 bg-black/20 px-2 py-2">
                  CURRENT
                  <div className="mt-1 text-red-100">{hits} HIT</div>
                </div>
                <div className="border border-red-200/30 bg-black/20 px-2 py-2">
                  STATUS
                  <div className="mt-1 text-red-100">RETRY</div>
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-center gap-4">
              <button
                type="button"
                onClick={restartGame}
                className="h-11 w-44 border-2 border-cyan-200 bg-cyan-300 text-black transition hover:bg-cyan-100 active:translate-y-px"
              >
                RESTART / SPACE
              </button>
              {isPractice && isClear && (
                <button
                  type="button"
                  onClick={() => navigate('/minigames')}
                  className="h-11 w-44 border-2 border-emerald-300 bg-emerald-400 text-black font-bold transition hover:bg-emerald-200 active:translate-y-px"
                >
                  RETURN TO LOBBY
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
