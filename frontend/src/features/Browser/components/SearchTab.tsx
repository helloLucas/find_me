import React, { useEffect, useState } from "react";
import { CHAPTER3_HINTS, type Chapter3Hint } from "../data/chapter3Hints";

interface SearchTabProps {
  onNavigate: (url: string, component: "news" | "home" | "pacman" | "history" | "doc" | "search", title: string) => void;
  isChapter3Mode?: boolean;
  currentView?: "home" | "history_list" | "hint_detail";
  setCurrentView?: (view: "home" | "history_list" | "hint_detail") => void;
  selectedHint?: Chapter3Hint | null;
  setSelectedHint?: (hint: Chapter3Hint | null) => void;
  detailOrigin?: "home" | "history_list" | null;
  setDetailOrigin?: (origin: "home" | "history_list" | null) => void;
}

export const SearchTab: React.FC<SearchTabProps> = ({
  isChapter3Mode = false,
  currentView = "home",
  setCurrentView = () => {},
  selectedHint = null,
  setSelectedHint = () => {},
  detailOrigin = null,
  setDetailOrigin = () => {},
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching" | "no_results">("idle");

  // 컴포넌트 마운트 해제 시 검색 상태 초기화
  useEffect(() => {
    return () => {
      setSearchQuery("");
      setSearchStatus("idle");
    };
  }, []);

  // 탭 상태 전환 감지 시 검색값 리셋
  useEffect(() => {
    if (currentView === "home") {
      setSearchQuery("");
      setSearchStatus("idle");
    }
  }, [currentView]);

  // 챕터 3 키워드 매칭 로직 (홈 검색 전용)
  const searchChapter3 = (query: string): Chapter3Hint | null => {
    const normalized = query.toLowerCase().replace(/\s+/g, " ").trim();
    if (!normalized) return null;

    return (
      CHAPTER3_HINTS.find((hint) =>
        hint.keywords.some((k) => normalized.includes(k.toLowerCase()))
      ) || null
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (isChapter3Mode) {
      setSearchStatus("searching");
      setTimeout(() => {
        const result = searchChapter3(searchQuery);
        if (result) {
          // 매칭되는 항목이 있을 경우 즉시 'hint_detail'로 이동하여 렌더링
          setSelectedHint(result);
          setDetailOrigin("home");
          setCurrentView("hint_detail");
          setSearchStatus("idle");
        } else {
          setSearchStatus("no_results");
        }
      }, 600);
      return;
    }

    // 일반 검색 동작
    setSearchStatus("searching");
    setTimeout(() => {
      setSearchStatus("no_results");
    }, 600);
  };

  const handleHistoryItemClick = (hint: Chapter3Hint) => {
    setSearchStatus("searching");
    setSelectedHint(null);
    setDetailOrigin("history_list");
    setCurrentView("hint_detail");

    setTimeout(() => {
      setSelectedHint(hint);
      setSearchStatus("idle");
    }, 600);
  };

  // 방문 기록 가짜 시간 데이터 생성용 유틸
  const getFakeTime = (id: number) => {
    const hours = String(9 - Math.floor(id / 2)).padStart(2, "0");
    const minutes = String((id * 13) % 60).padStart(2, "0");
    const seconds = String((id * 27) % 60).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  // ==================== 1. 방문 기록 리스트 뷰 (history_list) ====================
  if (isChapter3Mode && currentView === "history_list") {
    return (
      <div className="w-full h-full bg-[#07040e] text-[#c7b3ff] flex flex-col font-sans select-none animate-fade-in">
        {/* 방문 기록 헤더 바 (지시서에 따라 미니검색창 및 홈버튼 제거하고 리스트만 깔끔하게 구성) */}
        <div className="w-full bg-[#110a26] border-b border-[#543ab7]/50 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-[#4ce2fc]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-bold tracking-wider text-[#4ce2fc] uppercase font-mono">
              방문 기록 (System Logs)
            </span>
          </div>
        </div>

        {/* 방문 기록 컨텐츠 본문 */}
        <div className="flex-1 overflow-y-auto px-8 py-6 flex justify-center">
          <div className="w-full max-w-4xl">
            {/* 서브 타이틀 */}
            <div className="border-b border-[#543ab7]/30 pb-2 mb-4 flex items-center justify-between text-xs text-[#543ab7] font-mono">
              <span>NEXUS SEARCH LOGS</span>
              <span>TOTAL {CHAPTER3_HINTS.length} ITEMS</span>
            </div>

            <div className="flex flex-col gap-2">
              {CHAPTER3_HINTS.map((hint) => (
                <div
                  key={hint.id}
                  onClick={() => handleHistoryItemClick(hint)}
                  className="group w-full flex items-center justify-between bg-[#0d071c] hover:bg-[#150d2e] border border-[#543ab7]/30 hover:border-[#4ce2fc]/60 px-5 py-3.5 rounded-sm cursor-pointer transition-all duration-200 hover:shadow-[0_0_12px_rgba(76,226,252,0.15)]"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* 가짜 접근 시각 */}
                    <span className="text-[11px] font-mono text-[#543ab7] group-hover:text-[#a48cff] tracking-wider shrink-0">
                      {getFakeTime(hint.id)}
                    </span>
                    {/* 힌트 타이틀 */}
                    <span className="text-sm font-semibold text-[#c7b3ff] group-hover:text-[#4ce2fc] truncate">
                      {hint.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden sm:inline-block text-[10px] font-mono border border-[#543ab7]/30 text-[#543ab7] px-2 py-0.5 rounded uppercase">
                      system_audit_log
                    </span>
                    <svg className="w-4 h-4 text-[#543ab7] group-hover:text-[#4ce2fc] transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 2. 힌트 상세 본문 뷰 (hint_detail) ====================
  if (isChapter3Mode && currentView === "hint_detail") {
    return (
      <div className="w-full h-full bg-[#07040e] text-[#c7b3ff] flex flex-col font-sans select-none animate-fade-in">
        <style>{`
          @keyframes decrypt-fill {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          .decrypt-bar-fill {
            animation: decrypt-fill 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          }
        `}</style>
        {/* 상세 본문 영역 */}
        <div className="flex-1 overflow-y-auto px-8 py-10 flex flex-col items-center justify-start">
          <div className="w-full max-w-2xl">
            {searchStatus === "searching" ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="text-sm text-[#4ce2fc] tracking-widest animate-pulse font-mono uppercase">
                  Log decrypting...
                </div>
                <div className="w-32 h-1 bg-[#110a26] rounded overflow-hidden relative border border-[#543ab7]/30">
                  <div className="h-full bg-[#4ce2fc] absolute top-0 left-0 decrypt-bar-fill" />
                </div>
              </div>
            ) : (
              selectedHint && (
                <div className="w-full border border-[#543ab7]/70 rounded bg-[#0d071c]/90 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)] animate-fade-in">
                  {/* 상세 뷰 헤더 */}
                  <div className="flex items-center gap-2.5 px-5 py-3.5 bg-[#110a26] border-b border-[#543ab7]/60">
                    <svg className="w-4 h-4 text-[#4ce2fc]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-bold text-[#4ce2fc] tracking-wider font-mono">
                      {selectedHint.title}
                    </span>
                  </div>

                  {/* 상세 뷰 본문 */}
                  <div className="px-6 py-6 text-xs text-[#c7b3ff] leading-relaxed font-sans whitespace-pre-wrap select-text selection:bg-[#4ce2fc]/20 selection:text-[#4ce2fc]">
                    {selectedHint.content}
                  </div>
                </div>
              )
            )}
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
      <form onSubmit={handleSearch} className="w-full max-w-[480px] flex flex-col items-center mb-6">
        <div className="w-full flex items-center bg-[#110a26] border-2 border-[#543ab7] rounded-sm px-4 py-2 hover:border-[#a48cff] focus-within:border-[#a48cff] focus-within:shadow-[0_0_15px_rgba(164,140,255,0.2)] shadow-[inset_0_0_10px_rgba(84,58,183,0.3)] transition-all">
          <svg className="w-4 h-4 text-[#a48cff] opacity-70 mr-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search the network..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (searchStatus === "no_results") setSearchStatus("idle");
            }}
            className="w-full bg-transparent border-none outline-none text-[#c7b3ff] placeholder-[#543ab7] text-sm font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSearchStatus("idle");
              }}
              className="text-[#543ab7] hover:text-[#a48cff] text-xs px-1 font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </form>

      {/* 검색 결과 영역 */}
      <div className="w-full max-w-[480px] pb-8 flex flex-col items-center justify-start min-h-[80px]">
        {/* 검색 중 */}
        {searchStatus === "searching" && (
          <div className="h-10 flex items-center justify-center">
            <div className="text-xs text-[#a48cff] tracking-wider animate-pulse uppercase font-mono">
              Searching...
            </div>
          </div>
        )}

        {/* 검색 결과 없음 */}
        {searchStatus === "no_results" && (
          <div className="h-10 flex items-center justify-center">
            <div className="text-xs text-[#ff9d76] border border-[#ff9d76]/30 bg-[#ff9d76]/5 rounded-sm px-4 py-2 tracking-wide font-sans text-center shadow-[0_0_10px_rgba(255,157,118,0.1)]">
              No search results found.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
