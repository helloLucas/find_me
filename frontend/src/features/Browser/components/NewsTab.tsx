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

type NewsCard = {
  id: string;
  title: string;
  summary?: string;
  publisher?: string;
  thumbnail?: string;
};

const DEFAULT_NEWS_CARDS: NewsCard[] = [
  {
    id: "good_article",
    title: "넥서스, 인류의 삶을 바꾼 완전 연결 시스템",
    summary: "도시 운영부터 개인 건강관리까지, 넥서스 플랫폼이 바꾼 일상의 변화.",
    publisher: "Nexus Daily",
    thumbnail: "news_good_01",
  },
  {
    id: "missing_people_article",
    title: "최근 늘어나는 실종 사례, 단순 통계 이상인가?",
    summary: "최근 세 달간 보고된 실종 건수가 예년 대비 급증하며 원인 분석이 이어지고 있다.",
    publisher: "Central News",
    thumbnail: "news_missing_01",
  },
  {
    id: "dark_article",
    title: "넥서스의 어두운 면: 사라진 기록들에 대한 제보",
    summary: "삭제된 문서와 누락된 기록을 추적한 익명 제보가 공개됐다.",
    publisher: "Unknown Archive",
    thumbnail: "news_dark_01",
  },
];

type NewsViewMode = "auto" | "list" | "article";

interface NewsTabProps {
  viewMode?: NewsViewMode;
  onFallbackOpenArticle?: (card: NewsCard) => void;
}

function normalizeArticleCorruption(value: unknown): ArticleCorruption | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const paragraphIndexes = Array.isArray(record.paragraphIndexes)
    ? record.paragraphIndexes
        .map((entry) => Number(entry))
        .filter((entry) => Number.isInteger(entry) && entry >= 0)
    : [];

  const intensity = record.intensity === "active" ? "active" : record.intensity === "subtle" ? "subtle" : null;
  if (paragraphIndexes.length === 0 || !intensity) return null;

  const inspectIndex = Number(record.inspectIndex);

  return {
    paragraphIndexes,
    intensity,
    inspectIndex: Number.isInteger(inspectIndex) && inspectIndex >= 0 ? inspectIndex : undefined,
  };
}

export const NewsTab: React.FC<NewsTabProps> = ({
  viewMode = "auto",
  onFallbackOpenArticle,
}) => {
  const { currentNode, submitStoryAction, submitStoryClick, submitStoryInspect } =
    useStoryRuntimeStore();
  const content = useBrowserContentStore((state) => state.content);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTriggeredNodeIdRef = useRef<number | null>(null);
  const contentNewsCards = Array.isArray(content.newsCards) ? (content.newsCards as NewsCard[]) : [];
  const newsCards = contentNewsCards.length > 0 ? contentNewsCards : DEFAULT_NEWS_CARDS;
  const articleTitle = typeof content.articleTitle === "string" ? content.articleTitle : null;
  const hasArticle = Boolean(articleTitle);
  const showArticle = viewMode === "list" ? false : viewMode === "article" ? hasArticle : hasArticle;
  const articleBody: string[] = Array.isArray(content.articleBody) ? content.articleBody.map(String) : [];
  const articleCorruption = normalizeArticleCorruption(content.articleCorruption);
  const corruptedParagraphIndexes = new Set(articleCorruption?.paragraphIndexes ?? []);
  const isScrollTriggeredArticleNode = currentNode?.code === "CH1_DARK_ARTICLE_OPEN";
  const articleBodyClassName = [
    "space-y-4",
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
  }, [currentNode?.id]);

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
      if (!isScrollTriggeredArticleNode || !showArticle) return;

      const element = event.currentTarget;
      const scrollThreshold = Math.max(16, element.clientHeight * 0.1);
      const isAtBottom =
        element.scrollTop + element.clientHeight >= element.scrollHeight - scrollThreshold;

      if (isAtBottom) {
        triggerArticleScrollTransition();
      }
    },
    [isScrollTriggeredArticleNode, showArticle, triggerArticleScrollTransition]
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
                const isCorrupted = corruptedParagraphIndexes.has(index);
                const isInspectable =
                  isCorrupted &&
                  articleCorruption?.inspectIndex === index &&
                  canInspectArticle &&
                  Boolean(inspectTarget);

                if (isCorrupted && articleCorruption) {
                  return (
                    <CorruptedParagraph
                      key={`${currentNode?.code}-article-${index}`}
                      text={paragraph}
                      intensity={articleCorruption.intensity}
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
                      articleCorruption?.intensity === "active"
                        ? "story-article-paragraph story-article-paragraph--flicker"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-text={articleCorruption?.intensity === "active" ? paragraph : undefined}
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
                const canFallbackOpenArticle = card.id === "dark_article" && hasArticle;
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
                          return;
                        }

                        if (canFallbackOpenArticle) {
                          onFallbackOpenArticle?.(card);
                        }
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
