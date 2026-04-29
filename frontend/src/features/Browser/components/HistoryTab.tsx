import React from 'react';

interface HistoryItem {
  id: string;
  title: string;
  url: string;
  time: string;
  icon?: string;
}

interface HistoryTabProps {
  onNavigate: (url: string, component: 'doc', title: string) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ onNavigate }) => {
  const historyItems: HistoryItem[] = [
    {
      id: 'tar-hint',
      title: 'Archive utility: 여러 파일을 하나로 묶는 tar 명령어 사용법',
      url: 'system://docs/tar',
      time: '14:20',
    },
    {
      id: 'nc-hint',
      title: 'Netcat (nc) 가이드: 네트워크를 통한 파일 전송 및 연결',
      url: 'system://docs/nc',
      time: '12:05',
    },
  ];

  return (
    <div className="w-full h-full bg-[#0a0514] text-[#c7b3ff] flex flex-col font-sans overflow-hidden">
      {/* Chrome-like Header / Search Bar */}
      <header className="h-14 bg-[#110a26] border-b border-[#543ab7]/30 flex items-center px-6 gap-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#543ab7] rounded-full flex items-center justify-center text-[10px] text-white">H</div>
          <span className="text-lg font-medium text-[#a48cff]">History</span>
        </div>
        <div className="flex-1 max-w-2xl relative">
          <input 
            type="text" 
            placeholder="Search history" 
            className="w-full bg-[#1a1130] border border-[#543ab7]/50 rounded-md py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#a48cff] transition-colors"
            readOnly
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#543ab7]">
            🔍
          </span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-[#110a26] border-r border-[#543ab7]/20 py-4 flex-shrink-0 hidden md:block">
          <nav className="space-y-1 px-2">
            <div className="bg-[#543ab7]/20 text-[#a48cff] px-4 py-2 rounded-md text-sm font-medium cursor-default">
              History
            </div>
            <div className="text-[#6b5eb1] px-4 py-2 rounded-md text-sm hover:bg-white/5 cursor-not-allowed">
              Tabs from other devices
            </div>
            <div className="text-[#6b5eb1] px-4 py-2 rounded-md text-sm hover:bg-white/5 cursor-not-allowed">
              Clear browsing data
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {/* Date Group */}
            <div className="mb-8">
              <h2 className="text-sm font-bold text-[#a48cff] mb-4 flex items-center gap-2">
                Today - Monday, April 29, 2026
              </h2>
              
              <div className="bg-[#110a26]/50 border border-[#543ab7]/20 rounded-lg overflow-hidden">
                {historyItems.map((item, idx) => (
                  <div 
                    key={item.id}
                    className={`
                      group flex items-center p-3 gap-4 hover:bg-[#1a1130] transition-colors cursor-pointer
                      ${idx !== historyItems.length - 1 ? 'border-b border-[#543ab7]/10' : ''}
                    `}
                    onClick={() => onNavigate(item.url, 'doc', 'Documentation')}
                  >
                    <div className="w-4 h-4 border border-[#543ab7]/50 rounded-sm group-hover:border-[#a48cff] transition-colors" />
                    <span className="text-xs text-[#543ab7] w-12">{item.time}</span>
                    <div className="w-4 h-4 bg-[#1a1130] border border-[#543ab7]/30 rounded flex items-center justify-center text-[8px]">
                      🌐
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#c7b3ff] group-hover:text-[#fff] group-hover:underline truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[#543ab7] truncate">
                        {item.url}
                      </div>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 p-1 text-[#543ab7] hover:text-[#a48cff] transition-all">
                      ⋮
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Empty decoration for realism */}
            <div className="flex justify-center opacity-10 mt-20 pointer-events-none">
              <div className="w-full max-w-xs h-[1px] bg-gradient-to-r from-transparent via-[#543ab7] to-transparent" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
