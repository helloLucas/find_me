import React from "react";
import { useStoryRuntimeStore } from "../../story-runtime/storyRuntime.store";

type NewsCard = {
  id: string;
  title: string;
  summary?: string;
  publisher?: string;
  thumbnail?: string;
};

export const NewsTab: React.FC = () => {
  const { currentNode, submitStoryClick } = useStoryRuntimeStore();
  const content = currentNode?.outputBundle?.content ?? {};
  const newsCards = Array.isArray(content.newsCards) ? (content.newsCards as NewsCard[]) : [];
  const articleTitle = typeof content.articleTitle === "string" ? content.articleTitle : null;
  const articleBody: string[] = Array.isArray(content.articleBody) ? content.articleBody.map(String) : [];

  return (
    <div className="w-full h-full p-4 overflow-y-auto bg-[#0a0514] font-pixel selection:bg-[#a48cff] selection:text-[#0a0514]">
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
            <div className="space-y-4">
              {articleBody.map((paragraph, index) => (
                <p
                  key={`${currentNode?.code}-article-${index}`}
                  className="text-[#0ff] text-base leading-relaxed drop-shadow-[0_0_2px_#00ffff]"
                >
                  {paragraph}
                </p>
              ))}
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
                      if (card.id === "dark_article") {
                        submitStoryClick("dark_article");
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
