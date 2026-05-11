import React, { useEffect, useState } from "react";
import { useBrowserContentStore } from "../../../app/store/browserContentStore";
import { CHAPTER3_HINTS, type Chapter3Hint } from "../data/chapter3Hints";

interface SearchTabProps {
  onNavigate: (url: string, component: "news" | "home" | "pacman" | "history" | "doc" | "search", title: string) => void;
  isChapter3Mode?: boolean;
  currentView?: "home" | "history_list" | "search_result";
  setCurrentView?: (view: "home" | "history_list" | "search_result") => void;
  selectedHint?: Chapter3Hint | null;
  setSelectedHint?: (hint: Chapter3Hint | null) => void;
  detailOrigin?: "home" | "history_list" | null;
  setDetailOrigin?: (origin: "home" | "history_list" | null) => void;
  currentSearchQuery?: string | null;
  setCurrentSearchQuery?: (query: string | null) => void;
}

export const SearchTab: React.FC<SearchTabProps> = ({
  isChapter3Mode = false,
  currentView = "home",
  setCurrentView = () => { },
  selectedHint = null,
  setSelectedHint = () => { },
  detailOrigin = null,
  setDetailOrigin = () => { },
  currentSearchQuery = null,
  setCurrentSearchQuery = () => { },
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [headerSearchQuery, setHeaderSearchQuery] = useState("");
  const { searchHistory, addSearchHistory } = useBrowserContentStore();

  // 결과창 복호화(LOG DECRYPTING) 상태 관리
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    if (currentView === "search_result") {
      setIsDecrypting(true);
      const timer = setTimeout(() => {
        setIsDecrypting(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [currentView, selectedHint, currentSearchQuery]);

  // 상단 검색창 검색어 연동
  useEffect(() => {
    if (currentSearchQuery) {
      setHeaderSearchQuery(currentSearchQuery);
    }
  }, [currentSearchQuery]);

  // 컴포넌트 마운트 해제 시 로컬 입력창 초기화
  useEffect(() => {
    return () => {
      setSearchQuery("");
      setHeaderSearchQuery("");
    };
  }, []);

  // 탭 상태 전환 감지 시 검색창 리셋
  useEffect(() => {
    if (currentView === "home") {
      setSearchQuery("");
      setHeaderSearchQuery("");
    }
  }, [currentView]);

  // 챕터 3 키워드 매칭 로직
  const searchChapter3 = (query: string): Chapter3Hint | null => {
    const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
    if (!normalized) return null;

    return (
      CHAPTER3_HINTS.find((hint) =>
        hint.keywords.some((k) => normalized.includes(k.toLowerCase()))
      ) || null
    );
  };

  // 공통 검색 실행 핵심 로직
  const executeSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (isChapter3Mode) {
      // 1. 검색어 영속 기록 무조건 누적 저장
      addSearchHistory(trimmed);

      // 2. 매칭 수행 및 즉시 결과창으로 화면 전환
      const matched = searchChapter3(trimmed);
      setSelectedHint(matched);
      setDetailOrigin("home");
      setCurrentSearchQuery(trimmed);
      setCurrentView("search_result");
      return;
    }

    // 비챕터 3인 일반 검색인 경우
    setSelectedHint(null);
    setCurrentSearchQuery(trimmed);
    setCurrentView("search_result");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchQuery);
  };

  const handleHeaderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(headerSearchQuery);
  };

  // 섹션 1: 검색 기록 클릭 시
  const handleHistoryItemClick = (query: string) => {
    const matched = searchChapter3(query);
    setSelectedHint(matched);
    setDetailOrigin("history_list");
    setCurrentSearchQuery(query);
    setCurrentView("search_result");
  };

  // 섹션 2: 기본 힌트 정답 항목 클릭 시
  const handleStaticHintClick = (hint: Chapter3Hint) => {
    setSelectedHint(hint);
    setDetailOrigin("history_list");
    setCurrentSearchQuery(hint.title);
    setCurrentView("search_result");
  };

  // 로고 클릭 시 홈 화면 복귀 및 상태 초기화
  const handleLogoClick = () => {
    setCurrentView("home");
    setSelectedHint(null);
    setDetailOrigin(null);
    setCurrentSearchQuery(null);
  };

  // 가짜 타임스탬프 계산 함수 (초기 static 힌트 매핑용)
  const getFakeTime = (index: number) => {
    const minDiff = (index * 7) % 60;
    const secDiff = (index * 19) % 60;
    const hours = String(11 - Math.floor(index / 10)).padStart(2, "0");
    const minutes = String(Math.abs(45 - minDiff)).padStart(2, "0");
    const seconds = String(Math.abs(30 - secDiff)).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  // ==================== 1. 방문 기록 리스트 뷰 (history_list) ====================
  if (isChapter3Mode && currentView === "history_list") {
    return (
      <div className="w-full h-full bg-[#07040e] text-[#c7b3ff] flex flex-col font-sans select-none animate-fade-in overflow-y-auto">
        {/* 중앙 단(Column)을 강제해 주는 Max-Width 기반 이너 래퍼 */}
        <div className="w-full max-w-5xl mx-auto px-8 pt-8 pb-10 flex flex-col flex-1">
          {/* 방문 기록 헤더 바 */}
          <div className="w-full bg-[#110a26] border border-[#543ab7]/50 rounded-sm px-6 py-4 flex items-center shrink-0 mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-[#4ce2fc]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-bold tracking-wider text-[#4ce2fc] uppercase font-mono">
                방문 기록 (System Logs)
              </span>
            </div>
          </div>

          {/* 단일 통합 리스트 */}
          <div className="flex-1 flex flex-col gap-1.5 pb-8">
            {/* 플레이어 검색 기록 (동적) */}
            {searchHistory.map((item, index) => (
              <div
                key={`query-${index}`}
                onClick={() => handleHistoryItemClick(item.query)}
                className="group w-full flex items-center justify-between bg-[#0d071c]/80 hover:bg-[#1a1130] border border-[#543ab7]/30 hover:border-[#a48cff]/60 px-4 py-3 rounded-sm cursor-pointer transition-all duration-150 shrink-0"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-[10px] font-mono text-[#543ab7] group-hover:text-[#a48cff] shrink-0">
                    {item.time}
                  </span>
                  <span className="text-xs font-semibold text-[#c7b3ff] group-hover:text-[#a48cff] truncate">
                    {item.query}
                  </span>
                </div>
                <svg className="w-3.5 h-3.5 text-[#543ab7] group-hover:text-[#a48cff] shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}

            {/* 기본 힌트 목록 (고정) */}
            {CHAPTER3_HINTS.map((hint) => (
              <div
                key={`hint-${hint.id}`}
                onClick={() => handleStaticHintClick(hint)}
                className="group w-full flex items-center justify-between bg-[#0d071c] hover:bg-[#150d2e] border border-[#543ab7]/30 hover:border-[#4ce2fc]/60 px-4 py-3 rounded-sm cursor-pointer transition-all duration-150 hover:shadow-[0_0_8px_rgba(76,226,252,0.1)] shrink-0"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-[10px] font-mono text-[#543ab7] group-hover:text-[#4ce2fc] shrink-0">
                    {getFakeTime(searchHistory.length + hint.id)}
                  </span>
                  <span className="text-xs font-semibold text-[#c7b3ff] group-hover:text-[#4ce2fc] truncate">
                    {hint.title}
                  </span>
                </div>
                <svg className="w-3.5 h-3.5 text-[#543ab7] group-hover:text-[#4ce2fc] shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==================== 2. 결과창 조건부 렌더링 뷰 (search_result) ====================
  if (currentView === "search_result") {
    return (
      <div className="w-full h-full bg-[#07040e] text-[#c7b3ff] flex flex-col font-sans select-none animate-fade-in overflow-y-auto">
        <style>{`
          @keyframes decrypt-fill {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          .decrypt-bar-fill {
            animation: decrypt-fill 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          }
        `}</style>

        {/* 중앙 단(Column)을 강제해 주는 Max-Width 기반 이너 래퍼 */}
        <div className="w-full max-w-5xl mx-auto px-8 pt-8 pb-10 flex flex-col flex-1">
          {/* 상단 헤더 영역 (SERP Header) */}
          <div className="w-full bg-transparent border-none rounded-none px-0 py-2 flex items-center gap-5 shrink-0 z-10 mb-8">
            {/* 축소형 로고 */}
            <div
              onClick={handleLogoClick}
              className="w-32 shrink-0 flex items-center justify-start font-extrabold tracking-wider text-3xl font-mono select-none cursor-pointer transition-transform duration-150 active:scale-95"
            >
              <span className="text-[#4ce2fc]" style={{ textShadow: "0 0 8px rgba(76, 226, 252, 0.8)" }}>NE</span>
              <span className="text-[#ffe259] scale-110 inline-block font-sans mx-1" style={{ textShadow: "0 0 10px rgba(255, 226, 89, 0.95)" }}>X</span>
              <span className="text-[#4ce2fc]" style={{ textShadow: "0 0 8px rgba(76, 226, 252, 0.8)" }}>US</span>
            </div>

            {/* 가로형 얇은 구분선 */}
            <div className="w-[1px] h-6 bg-[#543ab7]/40 shrink-0" />

            {/* 상단 검색창 */}
            <form onSubmit={handleHeaderSearchSubmit} className="flex-1 max-w-xl">
              <div className="w-full flex items-center bg-[#0a0514] border border-[#543ab7]/70 rounded-sm px-6 py-3 hover:border-[#a48cff] focus-within:border-[#a48cff] focus-within:shadow-[0_0_15px_rgba(164,140,255,0.2)] transition-all">
                <svg className="w-5 h-5 text-[#a48cff] opacity-60 mr-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={headerSearchQuery}
                  onChange={(e) => setHeaderSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-[#c7b3ff] text-base font-sans placeholder-[#543ab7]/70"
                  placeholder="Search the network..."
                />
                {headerSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setHeaderSearchQuery("")}
                    className="text-[#543ab7] hover:text-[#a48cff] text-sm px-2 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* 하단 결과 콘텐츠 영역 - 정교한 좌측 시작 라인 동기화 (로고 w-32 + 구분선 및 간격 합산치 ml-[169px] 적용) */}
          <div className="flex-1 flex flex-col items-start justify-start select-text selection:bg-[#4ce2fc]/20 selection:text-[#4ce2fc] ml-0 sm:ml-[169px]">
            <div className="w-full max-w-2xl">
              {isDecrypting ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 w-full">
                  <div className="text-xs text-[#4ce2fc] tracking-widest animate-pulse font-mono uppercase">
                    LOG DECRYPTING...
                  </div>
                  <div className="w-32 h-1 bg-[#110a26] rounded overflow-hidden relative border border-[#543ab7]/30">
                    <div className="h-full bg-[#4ce2fc] absolute top-0 left-0 decrypt-bar-fill" />
                  </div>
                </div>
              ) : selectedHint ? (
                // 매칭 성공 화면 (구글 스타일 SERP)
                <div className="w-full animate-fade-in flex flex-col">
                  {/* 힌트 타이틀 (구글 링크 스타일) */}
                  <h2
                    className="text-lg font-bold text-[#4ce2fc] hover:underline cursor-pointer tracking-wide mb-3 transition-colors inline-block"
                    style={{ textShadow: "0 0 4px rgba(76, 226, 252, 0.3)" }}
                  >
                    {selectedHint.title}
                  </h2>

                  {/* 힌트 상세 본문 카드형 격벽 */}
                  <div className="border-l-2 border-[#543ab7]/50 pl-4 py-1 text-base text-[#c7b3ff] leading-relaxed whitespace-pre-wrap font-sans max-w-2xl bg-[#0d071c]/20 rounded-r-md pr-4">
                    {selectedHint.content}
                  </div>
                </div>
              ) : (
                // 매칭 실패 화면 (No search results found)
                <div className="w-full animate-fade-in flex flex-col py-6">
                  <div className="text-base text-[#ff9d76] tracking-wide mb-2 font-mono">
                    No search results found for "<span className="text-[#ffe259]">{currentSearchQuery}</span>"
                  </div>
                  <div className="text-base text-[#543ab7] font-sans">
                    입력하신 키워드를 다시 한 번 확인해 주십시오.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 3. 기본 메인 홈 화면 뷰 (home) ====================
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#0a0514] font-browser-chrome px-6 select-none animate-fade-in overflow-y-auto">
      {/* NEXUS Search 대형 로고 */}
      <div className="flex flex-col items-center mb-10 text-center">
        <div className="flex items-center justify-center font-extrabold tracking-[0.05em] text-5xl font-mono select-none">
          <span
            className="text-[#4ce2fc]"
            style={{ textShadow: "0 0 8px rgba(76, 226, 252, 0.9), 0 0 15px rgba(76, 226, 252, 0.6), 0 0 30px rgba(76, 226, 252, 0.35), 0 0 50px rgba(76, 226, 252, 0.15)" }}
          >
            NE
          </span>
          <span
            className="text-[#ffe259] mx-0.5 scale-110 inline-block font-sans"
            style={{ textShadow: "0 0 10px rgba(255, 226, 89, 0.95), 0 0 18px rgba(255, 226, 89, 0.65), 0 0 35px rgba(255, 226, 89, 0.4), 0 0 55px rgba(255, 226, 89, 0.2)" }}
          >
            X
          </span>
          <span
            className="text-[#4ce2fc]"
            style={{ textShadow: "0 0 8px rgba(76, 226, 252, 0.9), 0 0 15px rgba(76, 226, 252, 0.6), 0 0 30px rgba(76, 226, 252, 0.35), 0 0 50px rgba(76, 226, 252, 0.15)" }}
          >
            US
          </span>
        </div>

        <div
          className="w-full max-w-[320px] h-0.5 bg-[#ffe259] mt-4 opacity-75"
          style={{ boxShadow: "0 0 8px #ffe259, 0 0 16px rgba(255, 226, 89, 0.6), 0 0 30px rgba(255, 226, 89, 0.3)" }}
        />

        <div
          className="text-xs text-[#ffe259] font-bold tracking-[0.5em] mt-2 uppercase pl-[0.5em]"
          style={{ textShadow: "0 0 6px rgba(255, 226, 89, 0.8), 0 0 12px rgba(255, 226, 89, 0.4)" }}
        >
          SEARCH
        </div>
      </div>

      {/* 중앙 검색창 */}
      <form onSubmit={handleSearchSubmit} className="w-full max-w-[480px] flex flex-col items-center mb-6">
        <div className="w-full flex items-center bg-[#110a26] border-2 border-[#543ab7] rounded-sm px-4 py-2 hover:border-[#a48cff] focus-within:border-[#a48cff] focus-within:shadow-[0_0_15px_rgba(164,140,255,0.2)] shadow-[inset_0_0_10px_rgba(84,58,183,0.3)] transition-all">
          <svg className="w-4 h-4 text-[#a48cff] opacity-70 mr-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search the network..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-[#c7b3ff] placeholder-[#543ab7] text-sm font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-[#543ab7] hover:text-[#a48cff] text-xs px-1 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
