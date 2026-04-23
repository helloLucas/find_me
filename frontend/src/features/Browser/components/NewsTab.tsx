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

export const NewsTab: React.FC = () => {
  const { currentNode, submitStoryAction, submitStoryClick, submitStoryInspect } =
    useStoryRuntimeStore();
  const content = useBrowserContentStore((state) => state.content);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastScrollTriggeredNodeIdRef = useRef<number | null>(null);
  const newsCards = Array.isArray(content.newsCards) ? (content.newsCards as NewsCard[]) : [];
  const articleTitle = typeof content.articleTitle === "string" ? content.articleTitle : null;
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
      if (!isScrollTriggeredArticleNode) return;

      const element = event.currentTarget;
      const scrollThreshold = Math.max(16, element.clientHeight * 0.1);
      const isAtBottom =
        element.scrollTop + element.clientHeight >= element.scrollHeight - scrollThreshold;

      if (isAtBottom) {
        triggerArticleScrollTransition();
      }
    },
    [isScrollTriggeredArticleNode, triggerArticleScrollTransition]
  );

  return (
    <div
      ref={scrollContainerRef}
      className="w-full h-full p-4 overflow-y-auto bg-[#0a0514] font-pixel selection:bg-[#a48cff] selection:text-[#0a0514]"
      onScroll={handleScroll}
    >
      <div className="max-w-[680px] border-2 border-[#543ab7] p-6 rounded-sm bg-[#110a26] shadow-[inset_0_0_20px_rgba(84,58,183,0.3)]">
        <h1
          className="text-4xl text-[#c7b3ff] drop-shadow-[0_0_8px_#c7b3ff] mb-4 border-b-2 border-[#543ab7] pb-2 font-serif font-bold tracking-wide"
          style={{ textShadow: "0 0 10px #c7b3ff, 0 0 20px #8b5cf6" }}
        >
          Void City News
        </h1>

        {articleTitle ? (
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
              newsCards.map((card) => (
                <article
                  key={card.id}
                  className="border border-[#543ab7] bg-[#0a0514]/70 p-4 rounded-sm hover:border-[#0ff] transition-colors"
                >
                  <button
                    className="block w-full text-left"
                    onClick={() => {
                      if (canSubmitStoryAction(currentNode, "click", card.id)) {
                        void submitStoryClick(card.id);
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
              ))
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
