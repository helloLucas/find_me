import React, { useEffect, useState } from "react";
import { useClientStore } from "../../app/store/clientStore";

const RANDOM_ZONES = [
  "River", "Human", "Market", "Old Town",
  "School", "Housing", "Harbor", "Outlands", "Power Grid"
];

const getRandomZone = () => RANDOM_ZONES[Math.floor(Math.random() * RANDOM_ZONES.length)];

const DeletedText = ({ isPart2 }: { isPart2?: boolean }) => {
  const isAlreadyPlayed = useClientStore((state) => state.hasMapAnimationPlayed);
  const setHasMapAnimationPlayed = useClientStore((state) => state.setHasMapAnimationPlayed);
  const [text, setText] = useState(() => isAlreadyPlayed ? "[Deleted]" : `[${getRandomZone()}]`);
  const [done, setDone] = useState(isAlreadyPlayed);

  useEffect(() => {
    if (isAlreadyPlayed) return;
    // 0 to 0.5s delay before the glitch animation starts
    const delay = Math.random() * 500;

    const startTimer = setTimeout(() => {
      let ticks = 0;
      const interval = setInterval(() => {
        setText(`[#ERR_DEL#]`);
        ticks++;
        // 2 frames of glitch
        if (ticks > 2) {
          clearInterval(interval);
          setDone(true);
          if (isPart2) {
            setHasMapAnimationPlayed(true);
          }
        }
      }, 50);
    }, delay);

    return () => clearTimeout(startTimer);
  }, []);

  if (done) {
    return <span className="text-red-500 font-bold">[Deleted]</span>;
  }
  return <span className="text-gray-500">{text}</span>;
};

const BoundaryStabilityText = ({ prefix, targetValue, suffix, isPart2 }: { prefix: string, targetValue: number, suffix: string, isPart2?: boolean }) => {
  const isAlreadyPlayed = useClientStore((state) => state.hasMapAnimationPlayed);
  const setHasMapAnimationPlayed = useClientStore((state) => state.setHasMapAnimationPlayed);
  const [value, setValue] = useState(isAlreadyPlayed ? targetValue : 0);

  useEffect(() => {
    if (isAlreadyPlayed) return;

    // Start counting up after 500ms
    const startTimer = setTimeout(() => {
      let current = 0;
      const interval = setInterval(() => {
        current += Math.ceil(Math.random() * 3);
        if (current >= targetValue) {
          setValue(targetValue);
          clearInterval(interval);
          if (isPart2) {
            setHasMapAnimationPlayed(true);
          }
        } else {
          setValue(current);
        }
      }, 50);
    }, 500);

    return () => clearTimeout(startTimer);
  }, [targetValue]);

  return (
    <>
      <span>
        {prefix}
        <span className={value === targetValue ? "text-red-400 font-bold" : "text-gray-400"}>
          {value}
        </span>
        {suffix}
      </span>
      {value >= 30 && (
        <div className="text-red-500 font-bold mt-1">
          sh: process terminated by signal SIGSEGV (core dumped)
        </div>
      )}
    </>
  );
};

export const AnimatedTerminalLine = ({ text, isPart2 }: { text: string; isPart2?: boolean }) => {
  const boundaryMatch = text.match(/^(Boundary Stability: )(\d+)(%)$/);
  if (boundaryMatch) {
    return (
      <BoundaryStabilityText
        prefix={boundaryMatch[1]}
        targetValue={parseInt(boundaryMatch[2], 10)}
        suffix={boundaryMatch[3]}
        isPart2={isPart2}
      />
    );
  }

  if (text.includes("[Deleted]")) {
    const parts = text.split(/(\[Deleted\])/g);
    return (
      <>
        {parts.map((part, i) => {
          if (part === "[Deleted]") {
            return <DeletedText key={i} isPart2={isPart2} />;
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  }

  return <span>{text}</span>;
};
