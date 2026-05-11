import { useEffect, useRef } from "react";
import { trackAnalyticsEvent } from ".";

interface UseTrackVisibleOptions {
  eventName: string;
  params?: Record<string, string | number | boolean | undefined | null>;
  minVisibleMs?: number;
  threshold?: number;
  once?: boolean;
}

export function useTrackVisible<TElement extends HTMLElement>({
  eventName,
  params,
  minVisibleMs = 5000,
  threshold = 0.55,
  once = true,
}: UseTrackVisibleOptions) {
  const elementRef = useRef<TElement | null>(null);
  const sentRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const paramsRef = useRef(params);

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const clearVisibilityTimer = () => {
      if (timerRef.current === null) return;
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (once && sentRef.current) return;

        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          if (timerRef.current !== null) return;

          timerRef.current = window.setTimeout(() => {
            sentRef.current = true;
            timerRef.current = null;
            trackAnalyticsEvent(eventName, {
              ...paramsRef.current,
              visible_ms: minVisibleMs,
            });
          }, minVisibleMs);
          return;
        }

        clearVisibilityTimer();
      },
      { threshold: [threshold] }
    );

    observer.observe(element);

    return () => {
      clearVisibilityTimer();
      observer.disconnect();
    };
  }, [eventName, minVisibleMs, once, threshold]);

  return elementRef;
}
