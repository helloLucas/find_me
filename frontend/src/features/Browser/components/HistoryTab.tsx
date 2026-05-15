import React from "react";

interface HistoryItem {
  id: string;
  title: string;
  url: string;
  time: string;
}

interface HistoryTabProps {
  onNavigate: (url: string, component: "doc", title: string) => void;
}

function getTodayLabel() {
  const today = new Date();
  const date = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(today);

  return `오늘 - 2088년 ${date}`;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ onNavigate }) => {
  const historyItems: HistoryItem[] = [
    {
      id: "tar-hint",
      title: "tar 명령어 사용법: 여러 파일을 하나의 아카이브로 묶기",
      url: "system://docs/tar",
      time: "14:20",
    },
    {
      id: "nc-hint",
      title: "Netcat(nc) 가이드: 네트워크를 통한 파일 전송과 연결",
      url: "system://docs/nc",
      time: "12:05",
    },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#0a0514] font-browser-content text-[#c7b3ff]">
      <header className="flex h-14 shrink-0 items-center gap-5 border-b border-[#543ab7]/30 bg-[#110a26] px-6">
        <span className="text-lg font-semibold text-[#a48cff]">방문 기록</span>
        <div className="relative max-w-2xl flex-1">
          <input
            type="text"
            placeholder="방문 기록 검색"
            className="w-full rounded-md border border-[#543ab7]/50 bg-[#1a1130] px-4 py-1.5 text-sm text-[#c7b3ff] transition-colors placeholder:text-[#6b5eb1] focus:border-[#a48cff] focus:outline-none"
            readOnly
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-56 shrink-0 border-r border-[#543ab7]/20 bg-[#110a26] py-4 md:block">
          <nav className="space-y-1 px-2">
            <div className="rounded-md bg-[#543ab7]/20 px-4 py-2 text-sm font-medium text-[#a48cff]">
              방문 기록
            </div>
            <div className="cursor-not-allowed rounded-md px-4 py-2 text-sm text-[#6b5eb1]">
              다른 기기의 탭
            </div>
            <div className="cursor-not-allowed rounded-md px-4 py-2 text-sm text-[#6b5eb1]">
              인터넷 사용 기록 삭제
            </div>
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto px-8 py-8 terminal-scrollbar">
          <div className="mx-auto max-w-4xl">
            <section className="mb-8">
              <h2 className="mb-4 text-sm font-bold text-[#a48cff]">{getTodayLabel()}</h2>

              <div className="overflow-hidden rounded-lg border border-[#543ab7]/20 bg-[#110a26]/50">
                {historyItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`group flex w-full cursor-pointer items-center gap-4 p-3 text-left transition-colors hover:bg-[#1a1130] ${
                      index !== historyItems.length - 1 ? "border-b border-[#543ab7]/10" : ""
                    }`}
                    onClick={() => onNavigate(item.url, "doc", "문서")}
                  >
                    <span className="w-12 shrink-0 font-browser-code text-xs text-[#543ab7]">{item.time}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-[#c7b3ff] group-hover:text-white group-hover:underline">
                        {item.title}
                      </div>
                      <div className="truncate font-browser-code text-[11px] text-[#543ab7]">{item.url}</div>
                    </div>
                    <svg
                      className="h-3.5 w-3.5 shrink-0 text-[#543ab7] transition-transform group-hover:translate-x-0.5 group-hover:text-[#a48cff]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </section>

            <div className="pointer-events-none mt-20 flex justify-center opacity-10">
              <div className="h-px w-full max-w-xs bg-gradient-to-r from-transparent via-[#543ab7] to-transparent" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
