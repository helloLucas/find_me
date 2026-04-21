import React, { useState } from 'react';

interface Log {
  id: string;
  status: number;
  method: string;
  name: string;
  domain: string;
  timeMs: number;
  size: string;
}

export const NetworkDevTools: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'network' | 'console'>('network');
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [detailTab, setDetailTab] = useState<'Headers' | 'Response'>('Headers');

  const [consoleInput, setConsoleInput] = useState('');
  const [consoleHistory, setConsoleHistory] = useState<{type: 'in' | 'out' | 'error' | 'success', text: string}[]>([
    { type: 'error', text: 'Failed to load resource: the server responded with a status of 404 (Not Found)' }
  ]);

  React.useEffect(() => {
    // Initial initialization of global triggers if needed
  }, []);

  const handleConsoleSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && consoleInput.trim()) {
      const val = consoleInput.trim();
      setConsoleInput('');
      setConsoleHistory(prev => [...prev, { type: 'in', text: val }]);

      if (val === 'connect_core()') {
        const connectFn = (window as any).connect_core;
        if (typeof connectFn === 'function') {
          connectFn();
          setConsoleHistory(prev => [...prev, { type: 'success', text: 'Connecting... Core access granted.' }]);
        } else {
          setConsoleHistory(prev => [...prev, { type: 'error', text: 'Error: Core connection interface not initialized.' }]);
        }
      } else {
        setConsoleHistory(prev => [...prev, { type: 'error', text: `Uncaught ReferenceError: ${val} is not defined` }]);
      }
    }
  };

  // Generate 1 successful request and 20 404s
  const logs: Log[] = [
    { 
      id: "req_000", 
      status: 200, 
      method: "GET",
      name: "render-state.bin",
      domain: "api.nexus-news.net",
      timeMs: 12, 
      size: "1.2 KB" 
    },
    ...Array.from({ length: 20 }).map((_, i) => ({
      id: `req_${(i + 1).toString().padStart(3, '0')}`,
      status: 404,
      method: "GET",
      name: `img_${Math.random().toString(36).substring(7)}.png`,
      domain: "api.nexus-news.net",
      timeMs: Math.floor(Math.random() * 50 + 10),
      size: "0 KB"
    }))
  ];

  return (
    <div className="flex flex-col w-full h-full bg-[#242424] border-l border-[#444] font-sans text-[12px] text-[#cccccc] pointer-events-auto shadow-[-5px_0_15px_rgba(0,0,0,0.5)] z-[1000] relative overflow-hidden">
      
      {/* DevTools Top Navigation Bar */}
      <div className="flex items-center bg-[#1e1e1e] border-b border-[#333] px-2 h-7 flex-shrink-0">
        <button 
          className={`px-3 py-1 ${activeTab === 'network' ? 'border-b-2 border-[#5394fb] text-white' : 'text-[#888] hover:text-[#ccc]'}`}
          onClick={() => setActiveTab('network')}
        >
          Network
        </button>
        <button 
          className={`px-3 py-1 ${activeTab === 'console' ? 'border-b-2 border-[#5394fb] text-white' : 'text-[#888] hover:text-[#ccc]'}`}
          onClick={() => setActiveTab('console')}
        >
          Console
        </button>
      </div>

      {activeTab === 'console' && (
        <div className="flex-1 p-2 font-mono text-xs overflow-y-auto bg-[#1e1e1e] flex flex-col">
          <div className="border-b border-[#333] pb-1 mb-1 opacity-50 flex-shrink-0">top</div>
          <div className="flex-1 flex flex-col gap-1 overflow-y-auto pb-2">
            {consoleHistory.map((item, i) => (
              <div key={i} className={`
                ${item.type === 'in' ? 'text-[#ccc]' : ''}
                ${item.type === 'error' ? 'text-red-400 bg-red-900/10 px-1 border-l-2 border-red-500' : ''}
                ${item.type === 'success' ? 'text-green-400 bg-green-900/10 px-1 border-l-2 border-green-500' : ''}
                ${item.type === 'out' ? 'text-[#888]' : ''}
              `}>
                {item.type === 'in' ? '> ' : ''}{item.text}
              </div>
            ))}
          </div>
          <div className="flex items-center text-[#5394fb] mt-2 shrink-0">
            <span className="mr-2">&gt;</span>
            <input 
              type="text" 
              className="flex-1 bg-transparent outline-none text-[#ccc]"
              value={consoleInput}
              onChange={(e) => setConsoleInput(e.target.value)}
              onKeyDown={handleConsoleSubmit}
              autoFocus
              spellCheck={false}
            />
          </div>
        </div>
      )}

      {activeTab === 'network' && (
        <div className="flex-1 flex flex-row overflow-hidden relative bg-[#1e1e1e]">
          
          {/* Main Network Table (shrinks when detail is open) */}
          <div className={`flex-1 overflow-x-auto overflow-y-auto ${selectedLog ? 'border-r border-[#444] hidden md:block' : ''}`}>
            <table className="min-w-full text-left table-fixed whitespace-nowrap font-mono text-[11px]">
              <thead className="sticky top-0 bg-[#2d2d2d] text-[#ccc] border-b border-[#444]">
                <tr>
                  <th className="w-12 px-2 py-1 font-normal border-r border-[#444]">Status</th>
                  <th className="w-12 px-2 py-1 font-normal border-r border-[#444]">Method</th>
                  <th className="px-2 py-1 font-normal border-r border-[#444] w-28">Name</th>
                  <th className="px-2 py-1 font-normal border-r border-[#444] w-32">Domain</th>
                  <th className="w-12 px-2 py-1 font-normal border-r border-[#444]">Time</th>
                  <th className="w-12 px-2 py-1 font-normal">Size</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr 
                    key={log.id} 
                    className={`border-b border-[#333] cursor-pointer hover:bg-[#2a2d2e] ${selectedLog?.id === log.id ? 'bg-[#094771] text-white' : ''}`}
                    onClick={() => log.status === 200 && setSelectedLog(log)}
                  >
                    <td className="px-2 py-0.5 flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${log.status === 200 ? 'bg-[#3fb950]' : 'bg-[#f85149]'}`} />
                      <span className={selectedLog?.id === log.id ? "text-white" : log.status === 200 ? 'text-[#3fb950]' : 'text-[#f85149]'}>{log.status}</span>
                    </td>
                    <td className="px-2 py-0.5">{log.method}</td>
                    <td className="px-2 py-0.5 truncate" title={log.name}>{log.name}</td>
                    <td className="px-2 py-0.5 opacity-60 truncate" title={log.domain}>{log.domain}</td>
                    <td className="px-2 py-0.5">{log.timeMs} ms</td>
                    <td className="px-2 py-0.5">{log.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Network Detail Pane */}
          {selectedLog && (
            <div className="w-full md:w-[300px] flex-shrink-0 flex flex-col bg-[#242424]">
              {/* Detail Header */}
              <div className="flex items-center px-2 py-1 border-b border-[#444] bg-[#2d2d2d] gap-2 shrink-0">
                <button 
                  className="w-4 h-4 flex items-center justify-center hover:bg-[#444] rounded text-lg"
                  onClick={() => setSelectedLog(null)}
                >×</button>
                <span className="truncate flex-1 font-bold text-white text-[12px]">{selectedLog.name}</span>
              </div>
              
              {/* Detail Tabs */}
              <div className="flex items-center border-b border-[#444] bg-[#242424] px-2 h-7 shrink-0 text-[11px]">
                {['Headers', 'Response'].map(tab => (
                  <button 
                    key={tab}
                    className={`px-3 py-1 h-full ${detailTab === tab ? 'border-b-2 border-[#5394fb] text-white' : 'text-[#888] hover:text-[#ccc]'}`}
                    onClick={() => setDetailTab(tab as any)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Detail Content */}
              <div className="flex-1 overflow-y-auto p-2 text-[11px] leading-relaxed">
                {detailTab === 'Headers' && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <div className="font-bold text-[#ccc] mb-1">▼ General</div>
                      <div className="pl-3 flex flex-col gap-1">
                        <div className="flex"><span className="w-24 text-[#888]">Request URL:</span><span className="flex-1 break-all text-white">https://{selectedLog.domain}/{selectedLog.name}</span></div>
                        <div className="flex"><span className="w-24 text-[#888]">Request Method:</span><span className="flex-1 text-white">{selectedLog.method}</span></div>
                        <div className="flex"><span className="w-24 text-[#888]">Status Code:</span><span className="flex-1 flex items-center gap-1 text-white"><div className="w-2 h-2 rounded-full bg-[#3fb950]"/> 200 OK</span></div>
                        <div className="flex"><span className="w-24 text-[#888]">Remote Address:</span><span className="flex-1 text-white">208.103.161.1:443</span></div>
                        <div className="flex"><span className="w-24 text-[#888]">Referrer Policy:</span><span className="flex-1 text-white">strict-origin-when-cross-origin</span></div>
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-[#ccc] mb-1">▼ Response Headers</div>
                      <div className="pl-3 flex flex-col gap-1">
                        <div className="flex"><span className="w-32 text-[#888]">Content-Type:</span><span className="flex-1 text-white">application/octet-stream</span></div>
                        <div className="flex"><span className="w-32 text-[#888]">Cache-Control:</span><span className="flex-1 text-white">no-cache</span></div>
                        <div className="flex"><span className="w-32 text-[#888]">Server:</span><span className="flex-1 text-white">nginx/1.24.0</span></div>
                        <div className="flex"><span className="w-32 text-[#888]">X-Powered-By:</span><span className="flex-1 text-white">VoidCity-Core/3.4</span></div>
                      </div>
                    </div>
                  </div>
                )}
                {detailTab === 'Response' && (
                  <div className="font-mono text-[#a5d6ff] whitespace-pre-wrap break-all p-1 bg-[#0d1117] border border-[#30363d] rounded">
                    {`{"success": true, "timestamp": 1893456000, "payload": "U2FsdGVkX19/4s8cR9tQZz0Y..."}`}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
