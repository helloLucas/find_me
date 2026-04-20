import React from 'react';

export const NetworkDevTools: React.FC = () => {
  // Generate 1 successful request and 20 404s
  const logs = [
    { id: 0, status: 200, statusText: 'OK', url: 'http://voidcity-news/recent/1', time: '12ms', size: '1.2kb' },
    ...Array.from({ length: 20 }).map((_, i) => ({
      id: i + 1,
      status: 404,
      statusText: 'Not Found',
      url: `http://voidcity-news/assets/img_${Math.random().toString(36).substring(7)}.png`,
      time: `${Math.floor(Math.random() * 50 + 10)}ms`,
      size: '0kb'
    }))
  ];

  return (
    <div className="flex flex-col w-full h-full bg-[#111] border-l-2 border-[#543ab7] font-mono text-[11px] text-gray-300 pointer-events-auto shadow-[-5px_0_15px_rgba(0,0,0,0.5)] z-[1000] relative">
      <div className="flex items-center bg-[#222] border-b border-[#333] px-2 py-1">
        <div className="text-white font-bold ml-1 border-b-2 border-cyan-400 px-1">Network</div>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="min-w-full text-left table-fixed">
          <thead className="sticky top-0 bg-[#222] text-gray-400 text-[10px]">
            <tr>
              <th className="w-16 px-2 py-1 font-normal border-r border-[#333]">Status</th>
              <th className="px-2 py-1 font-normal border-r border-[#333]">Name</th>
              <th className="w-16 px-2 py-1 font-normal border-r border-[#333]">Time</th>
              <th className="w-16 px-2 py-1 font-normal">Size</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-[#222] hover:bg-[#333]">
                <td className={`px-2 py-0.5 whitespace-nowrap ${log.status === 200 ? 'text-green-500' : 'text-red-500'}`}>
                  {log.status} {log.statusText}
                </td>
                <td className="px-2 py-0.5 truncate" title={log.url}>
                  {log.url}
                </td>
                <td className="px-2 py-0.5 whitespace-nowrap">{log.time}</td>
                <td className="px-2 py-0.5 whitespace-nowrap">{log.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
