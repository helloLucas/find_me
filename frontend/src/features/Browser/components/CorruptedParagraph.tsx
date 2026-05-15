import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ArticleCorruptionIntensity } from "../../../shared/types/story";
import "./CorruptedParagraph.css";

type CorruptedParagraphProps = {
  text: string;
  intensity: ArticleCorruptionIntensity;
  inspectable?: boolean;
  onInspect?: () => void;
};

const SCRAMBLE_INTERVAL_MS: Record<ArticleCorruptionIntensity, number> = {
  active: 340,
  subtle: 1700,
};

const GLITCH_GLYPHS = [
  "뷁",
  "궹",
  "긄",
  "퟿",
  "먻",
  "귺",
  "뫃",
  "▒",
  "▓",
  "▚",
  "▞",
  "▙",
  "▛",
  "▜",
  "▟",
  "⍰",
  "#",
  "%",
  "&",
];

function randomGlyph() {
  return GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)];
}

type ScrambleVariant = "base" | "cyan" | "magenta";

type ScrambledFrame = {
  baseLines: string[];
  cyanLines: string[];
  magentaLines: string[];
};

function getReplacementChance(
  intensity: ArticleCorruptionIntensity,
  variant: ScrambleVariant
) {
  if (intensity === "active") {
    if (variant === "base") return 0.1;
    if (variant === "cyan") return 0.17;
    return 0.16;
  }

  if (variant === "base") return 0.02;
  if (variant === "cyan") return 0.05;
  return 0.06;
}

function buildScrambledFrame(
  lines: string[],
  intensity: ArticleCorruptionIntensity
): ScrambledFrame {
  const scrambleWithVariant = (variant: ScrambleVariant) =>
    lines.map((line) =>
      Array.from(line)
        .map((character) => {
          if (character.trim() === "") return character;

          const replacementChance = getReplacementChance(intensity, variant);
          if (/[.,'"!?():;0-9-]/.test(character)) {
            return Math.random() < replacementChance * 0.3 ? randomGlyph() : character;
          }

          return Math.random() < replacementChance ? randomGlyph() : character;
        })
        .join("")
    );

  return {
    baseLines: scrambleWithVariant("base"),
    cyanLines: scrambleWithVariant("cyan"),
    magentaLines: scrambleWithVariant("magenta"),
  };
}

function useRenderedLines(text: string) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const [lines, setLines] = useState<string[]>(() => [text]);

  useEffect(() => {
    const element = measureRef.current;
    if (!element) return;

    const calculateLines = () => {
      const textNode = element.firstChild;
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
        setLines([text]);
        return;
      }

      const characters = Array.from(text);
      if (characters.length === 0) {
        setLines([""]);
        return;
      }

      const range = document.createRange();
      const nextLines: string[] = [];
      let currentLine = "";
      let previousTop: number | null = null;

      characters.forEach((character, index) => {
        range.setStart(textNode, index);
        range.setEnd(textNode, index + 1);

        const rect = range.getClientRects()[0];
        const currentTop = rect ? rect.top : previousTop;

        if (
          previousTop !== null &&
          currentTop !== null &&
          Math.abs(currentTop - previousTop) > 1
        ) {
          nextLines.push(currentLine);
          currentLine = character;
        } else {
          currentLine += character;
        }

        if (currentTop !== null) {
          previousTop = currentTop;
        }
      });

      nextLines.push(currentLine);
      setLines(nextLines.length > 0 ? nextLines : [text]);
    };

    calculateLines();

    const resizeObserver = new ResizeObserver(() => {
      calculateLines();
    });

    resizeObserver.observe(element);
    window.addEventListener("resize", calculateLines);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", calculateLines);
    };
  }, [text]);

  return { lines, measureRef };
}

function useElementVisibility<T extends Element>() {
  const targetRef = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const element = targetRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(Boolean(entry?.isIntersecting));
      },
      {
        root: null,
        rootMargin: "120px 0px",
        threshold: 0,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { targetRef, isVisible };
}

function useScrambledFrame(
  lines: string[],
  intensity: ArticleCorruptionIntensity,
  isVisible: boolean
) {
  const [scrambledFrame, setScrambledFrame] = useState(() =>
    buildScrambledFrame(lines, intensity)
  );

  useEffect(() => {
    if (!isVisible) return;

    const syncFrameId = window.setTimeout(() => {
      setScrambledFrame(buildScrambledFrame(lines, intensity));
    }, 0);

    const intervalMs = SCRAMBLE_INTERVAL_MS[intensity];
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      setScrambledFrame(buildScrambledFrame(lines, intensity));
    }, intervalMs);

    return () => {
      window.clearTimeout(syncFrameId);
      window.clearInterval(intervalId);
    };
  }, [lines, intensity, isVisible]);

  return scrambledFrame;
}

function renderLines(lines: string[]) {
  return lines.map((line, index) => (
    <span key={`line-${index}`} className="story-corrupted-paragraph__line">
      {line.length > 0 ? line : "\u00A0"}
    </span>
  ));
}

function CorruptionLayers({
  text,
  intensity,
}: {
  text: string;
  intensity: ArticleCorruptionIntensity;
}) {
  const { lines, measureRef } = useRenderedLines(text);
  const { targetRef, isVisible } = useElementVisibility<HTMLSpanElement>();
  const scrambledFrame = useScrambledFrame(lines, intensity, isVisible);
  const baseLines = useMemo(() => renderLines(scrambledFrame.baseLines), [scrambledFrame.baseLines]);
  const cyanLines = useMemo(() => renderLines(scrambledFrame.cyanLines), [scrambledFrame.cyanLines]);
  const magentaLines = useMemo(
    () => renderLines(scrambledFrame.magentaLines),
    [scrambledFrame.magentaLines]
  );

  return (
    <span ref={targetRef} className="story-corrupted-paragraph__content">
      <span aria-hidden="true" ref={measureRef} className="story-corrupted-paragraph__layout">
        {text}
      </span>
      <span className="story-corrupted-paragraph__base">{baseLines}</span>
      <span
        aria-hidden="true"
        className="story-corrupted-paragraph__ghost story-corrupted-paragraph__ghost--cyan"
      >
        {cyanLines}
      </span>
      <span
        aria-hidden="true"
        className="story-corrupted-paragraph__ghost story-corrupted-paragraph__ghost--magenta"
      >
        {magentaLines}
      </span>
      <span aria-hidden="true" className="story-corrupted-paragraph__scanlines" />
      <span className="sr-only">{text}</span>
    </span>
  );
}

const CorruptedParagraphComponent: React.FC<CorruptedParagraphProps> = ({
  text,
  intensity,
  inspectable = false,
  onInspect,
}) => {
  const className = [
    "story-corrupted-paragraph",
    `story-corrupted-paragraph--${intensity}`,
    inspectable ? "story-corrupted-paragraph--inspectable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (inspectable) {
    return (
      <button type="button" className={className} onClick={onInspect}>
        <CorruptionLayers text={text} intensity={intensity} />
      </button>
    );
  }

  return (
    <p className={className}>
      <CorruptionLayers text={text} intensity={intensity} />
    </p>
  );
};

export const CorruptedParagraph = React.memo(CorruptedParagraphComponent);
