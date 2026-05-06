import React, { useState } from "react";

interface SearchTabProps {
  onNavigate: (url: string, component: "news" | "home" | "pacman" | "history" | "doc" | "search", title: string) => void;
}

export const SearchTab: React.FC<SearchTabProps> = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchStatus, setSearchStatus] = useState<"idle" | "searching" | "no_results">("idle");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchStatus("searching");
    setTimeout(() => {
      setSearchStatus("no_results");
    }, 600);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0514] font-browser-chrome px-6 select-none animate-fade-in">
      {/* NEXUS Search 헤더 */}
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

      {/* 검색창 */}
      <form onSubmit={handleSearch} className="w-full max-w-[480px] flex flex-col items-center mb-8">
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

      {/* 검색 결과 */}
      <div className="h-10 flex items-center justify-center">
        {searchStatus === "searching" && (
          <div className="text-xs text-[#a48cff] tracking-wider animate-pulse uppercase font-mono">
            Searching...
          </div>
        )}
        {searchStatus === "no_results" && (
          <div className="text-xs text-[#ff9d76] border border-[#ff9d76]/30 bg-[#ff9d76]/5 rounded-sm px-4 py-2 tracking-wide font-sans text-center shadow-[0_0_10px_rgba(255,157,118,0.1)]">
            No search results found.
          </div>
        )}
      </div>
    </div>
  );
};
