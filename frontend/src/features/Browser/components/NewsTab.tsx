import React, { useCallback, useEffect, useRef } from "react";
import { useBrowserContentStore } from "../../../app/store/browserContentStore";
import type { ArticleCorruption } from "../../../shared/types/story";
import { useStoryRuntimeStore } from "../../story-runtime/storyRuntime.store";
import {
  canSubmitStoryAction,
  getStoryInspectTarget,
} from "../../story-runtime/storyActionGuards";
import { CorruptedParagraph } from "./CorruptedParagraph";
import "./NewsTab.css";
import { DEFAULT_NEWS_CARDS, FALLBACK_ARTICLES, type NewsCard } from "../data/newsData";
type NewsViewMode = "auto" | "list" | "article";

interface NewsTabProps {
  viewMode?: NewsViewMode;
  activeTabTitle?: string;
  onFallbackOpenArticle?: (card: NewsCard) => void;
}

const SCROLL_BOTTOM_TOLERANCE_PX = 2;
const CORRUPTION_CASCADE_DURATION_MS = 1400;

function normalizeArticleCorruption(value: unknown): ArticleCorruption | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const paragraphIndexes = Array.isArray(record.paragraphIndexes)
    ? record.paragraphIndexes
      .map((entry) => Number(entry))
      .filter((entry) => Number.isInteger(entry) && entry >= 0)
    : [];

  const intensity = record.intensity === "active" ? "active" : record.intensity === "subtle" ? "subtle" : null;
  if (!intensity) return null;

  const inspectIndex = Number(record.inspectIndex);

  return {
    paragraphIndexes,
    intensity,
    inspectIndex: Number.isInteger(inspectIndex) && inspectIndex >= 0 ? inspectIndex : undefined,
  };
}

export const NewsTab: React.FC<NewsTabProps> = ({
  viewMode = "auto",
  activeTabTitle,
  onFallbackOpenArticle,
}) => {
  const { currentNode, submitStoryAction, submitStoryClick, submitStoryInspect } =
    useStoryRuntimeStore();
  const content = useBrowserContentStore((state) => state.content);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollCorruptionNodeId, setScrollCorruptionNodeId] = React.useState<number | null>(null);
  const [corruptionProgress, setCorruptionProgress] = React.useState(0);
  const corruptionAnimationFrameRef = useRef<number | null>(null);
  const corruptionStartTimeRef = useRef<number | null>(null);
  const lastScrollTriggeredNodeIdRef = useRef<number | null>(null);
  const contentNewsCards = Array.isArray(content.newsCards) ? (content.newsCards as NewsCard[]) : [];
  const newsCards = contentNewsCards.length > 0 ? contentNewsCards : DEFAULT_NEWS_CARDS;

  const activeFallbackArticle = Object.values(FALLBACK_ARTICLES).find(
    (art) => art.title === activeTabTitle
  );

  const useFallback = Boolean(activeFallbackArticle && (!content.articleTitle || content.articleTitle !== activeTabTitle));

  const articleTitle = useFallback ? activeFallbackArticle!.title : (typeof content.articleTitle === "string" ? content.articleTitle : null);
  const hasArticle = Boolean(articleTitle);
  const showArticle = viewMode === "list" ? false : viewMode === "article" ? hasArticle : hasArticle;
  const articleBody: string[] = useFallback
    ? activeFallbackArticle!.body
    : (Array.isArray(content.articleBody) ? content.articleBody.map(String) : []);
  const articleCorruption = useFallback ? null : normalizeArticleCorruption(content.articleCorruption);
  const corruptedParagraphIndexes = new Set(articleCorruption?.paragraphIndexes ?? []);
  const isScrollTriggeredArticleNode = currentNode?.code === "CH1_DARK_ARTICLE_OPEN";
  const isArticleScrollCorruptionNode =
    currentNode?.code === "CH1_ARTICLE_SCROLL_CORRUPTION";
  const usesScrollCascadeCorruption =
    showArticle && !useFallback && (isScrollTriggeredArticleNode || isArticleScrollCorruptionNode);
  const isCurrentNodeScrollCorruptionTriggered =
    currentNode != null && scrollCorruptionNodeId === currentNode.id;
  const scrollCorruptionTriggered =
    !useFallback && (isArticleScrollCorruptionNode || isCurrentNodeScrollCorruptionTriggered);
  const displayedCorruptionProgress = isArticleScrollCorruptionNode
    ? 1
    : isCurrentNodeScrollCorruptionTriggered
      ? corruptionProgress
      : 0;
  const articleBodyClassName = [
    "flex",
    "flex-col",
    "gap-4",
    "story-article-body",
    articleCorruption?.intensity === "active" ? "story-article-body--active" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const inspectTarget = getStoryInspectTarget(currentNode);
  const canInspectArticle =
    inspectTarget != null && canSubmitStoryAction(currentNode, "inspect", inspectTarget);

  useEffect(() => {
    lastScrollTriggeredNodeIdRef.current = null;
    corruptionStartTimeRef.current = null;

    if (corruptionAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(corruptionAnimationFrameRef.current);
      corruptionAnimationFrameRef.current = null;
    }
  }, [currentNode?.id]);

  useEffect(() => {
    if (!scrollCorruptionTriggered || isArticleScrollCorruptionNode) return;

    const animateCorruption = (timestamp: number) => {
      if (corruptionStartTimeRef.current === null) {
        corruptionStartTimeRef.current = timestamp;
      }

      const elapsed = timestamp - corruptionStartTimeRef.current;
      const nextProgress = Math.min(elapsed / CORRUPTION_CASCADE_DURATION_MS, 1);
      setCorruptionProgress(nextProgress);

      if (nextProgress < 1) {
        corruptionAnimationFrameRef.current = window.requestAnimationFrame(animateCorruption);
        return;
      }

      corruptionAnimationFrameRef.current = null;
    };

    corruptionAnimationFrameRef.current = window.requestAnimationFrame(animateCorruption);

    return () => {
      if (corruptionAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(corruptionAnimationFrameRef.current);
        corruptionAnimationFrameRef.current = null;
      }
    };
  }, [isArticleScrollCorruptionNode, scrollCorruptionTriggered]);

  useEffect(() => {
    if (showArticle && scrollContainerRef.current) {
      const savedScrollTop = useBrowserContentStore.getState().newsScrollTop;
      if (savedScrollTop > 0) {
        const timeoutId = setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = savedScrollTop;
          }
        }, 30);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [showArticle]);

  const triggerArticleScrollTransition = useCallback(() => {
    if (!currentNode || !isScrollTriggeredArticleNode) return;
    if (lastScrollTriggeredNodeIdRef.current === currentNode.id) return;
    if (!canSubmitStoryAction(currentNode, "system", "auto")) return;

    lastScrollTriggeredNodeIdRef.current = currentNode.id;
    void submitStoryAction("system", "auto").catch(() => {
      if (lastScrollTriggeredNodeIdRef.current === currentNode.id) {
        lastScrollTriggeredNodeIdRef.current = null;
      }
    });
  }, [currentNode, isScrollTriggeredArticleNode, submitStoryAction]);

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const element = event.currentTarget;
      const { scrollTop, scrollHeight, clientHeight } = element;

      useBrowserContentStore.getState().setNewsScrollTop(scrollTop);

      const isAtBottom =
        scrollTop + clientHeight >= scrollHeight - SCROLL_BOTTOM_TOLERANCE_PX;

      if (
        usesScrollCascadeCorruption &&
        !scrollCorruptionTriggered &&
        isAtBottom
      ) {
        corruptionStartTimeRef.current = null;
        setCorruptionProgress(0);
        setScrollCorruptionNodeId(currentNode?.id ?? null);
      }

      if (!isScrollTriggeredArticleNode || !showArticle) return;

      if (isAtBottom) {
        triggerArticleScrollTransition();
      }
    },
    [
      currentNode?.id,
      isScrollTriggeredArticleNode,
      scrollCorruptionTriggered,
      showArticle,
      triggerArticleScrollTransition,
      usesScrollCascadeCorruption,
    ]
  );

  return (
    <div
      ref={scrollContainerRef}
      className="w-full h-full p-4 overflow-y-auto bg-[#0a0514] font-browser-article selection:bg-[#a48cff] selection:text-[#0a0514]"
      onScroll={handleScroll}
    >
      <div className="mx-auto w-full max-w-[680px] border-2 border-[#543ab7] p-6 rounded-sm bg-[#110a26] shadow-[inset_0_0_20px_rgba(84,58,183,0.3)]">
        <h1
          className="text-4xl text-[#c7b3ff] drop-shadow-[0_0_8px_#c7b3ff] mb-4 border-b-2 border-[#543ab7] pb-2 font-news-title font-bold tracking-wide"
          style={{ textShadow: "0 0 10px #c7b3ff, 0 0 20px #8b5cf6" }}
        >
          Void City News
        </h1>

        {showArticle ? (
          <article className="mt-6">
            <h2 className="text-[#ff9d76] text-2xl mb-4 drop-shadow-[0_0_5px_#ff9d76]">
              {articleTitle}
            </h2>
            <div className={articleBodyClassName}>
              {articleBody.map((paragraph, index) => {
                const total = articleBody.length;
                const cascadeThreshold =
                  total <= 1 ? 0 : index / Math.max(total - 1, 1);
                const isCorruptedByScrollCascade =
                  usesScrollCascadeCorruption &&
                  scrollCorruptionTriggered &&
                  displayedCorruptionProgress >= cascadeThreshold;
                const isCorruptedByMetadata =
                  !usesScrollCascadeCorruption && corruptedParagraphIndexes.has(index);
                const isCorrupted = isCorruptedByMetadata || isCorruptedByScrollCascade;
                const dynamicIntensity =
                  scrollCorruptionTriggered && displayedCorruptionProgress >= 0.65
                    ? "active"
                    : (articleCorruption?.intensity ?? "subtle");

                const isInspectable =
                  isCorrupted &&
                  articleCorruption?.inspectIndex === index &&
                  canInspectArticle &&
                  Boolean(inspectTarget);

                if (isCorrupted) {
                  return (
                    <CorruptedParagraph
                      key={`${currentNode?.code}-article-${index}`}
                      text={paragraph}
                      intensity={dynamicIntensity}
                      inspectable={isInspectable}
                      onInspect={() => {
                        if (isInspectable && inspectTarget) {
                          void submitStoryInspect(inspectTarget);
                        }
                      }}
                    />
                  );
                }

                return (
                  <p
                    key={`${currentNode?.code}-article-${index}`}
                    className={[
                      "text-base leading-relaxed text-[#0ff] drop-shadow-[0_0_2px_#00ffff]",
                      dynamicIntensity === "active" && isCorrupted
                        ? "story-article-paragraph story-article-paragraph--flicker"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </article>
        ) : (
          <div className="flex flex-col gap-5 mt-6">
            {newsCards.length > 0 ? (
              newsCards.map((card) => {
                const canSubmitCardClick = canSubmitStoryAction(currentNode, "click", card.id);
                const canFallbackOpenArticle = currentNode?.code === "CH1_NEWS_PORTAL" || hasArticle || canSubmitCardClick;
                const isCardClickable = canSubmitCardClick || canFallbackOpenArticle;

                return (
                  <article
                    key={card.id}
                    className={[
                      "border border-[#543ab7] bg-[#0a0514]/70 p-4 rounded-sm transition-colors",
                      isCardClickable ? "hover:border-[#0ff]" : "opacity-70",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <button
                      type="button"
                      disabled={!isCardClickable}
                      className={[
                        "block w-full text-left",
                        isCardClickable ? "cursor-pointer" : "cursor-default",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        if (canSubmitCardClick) {
                          void submitStoryClick(card.id);
                          if (card.id === "dark_article") {
                            return;
                          }
                        }

                        onFallbackOpenArticle?.(card);
                      }}
                    >
                      <p className="text-[11px] uppercase tracking-[0.25em] text-[#a48cff] mb-2">
                        {card.publisher ?? "Unknown Archive"}
                      </p>
                      <h2 className="text-[#ff9d76] text-xl mb-2 drop-shadow-[0_0_5px_#ff9d76]">
                        {card.title}
                      </h2>
                      {card.summary && (
                        <p className="text-[#0ff] text-base leading-relaxed drop-shadow-[0_0_2px_#00ffff]">
                          {card.summary}
                        </p>
                      )}
                    </button>
                  </article>
                );
              })
            ) : (
              <p className="text-[#0ff] text-base leading-relaxed">
                No story news data loaded.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
