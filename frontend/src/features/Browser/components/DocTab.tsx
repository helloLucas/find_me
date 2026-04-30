import React, { useState } from 'react';
import { useBrowserContentStore } from '../../../app/store/browserContentStore';

interface DocTabProps {
  url: string;
}

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const setLastCopiedCommand = useBrowserContentStore((state) => state.setLastCopiedCommand);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setLastCopiedCommand(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="group relative bg-[#1e293b]/50 border border-slate-800 rounded-xl p-8 font-mono text-xl shadow-2xl overflow-hidden">
      <code className="text-[#818cf8] whitespace-pre-wrap break-all">{code}</code>
      <button
        onClick={handleCopy}
        className="absolute top-4 right-4 p-2 rounded-md bg-[#1e293b] border border-slate-700 text-[#94a3b8] hover:text-white hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-200"
        title="Copy to clipboard"
      >
        {copied ? (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
        )}
      </button>
    </div>
  );
};

export const DocTab: React.FC<DocTabProps> = ({ url }) => {
  const isTarDoc = url.includes('/tar');
  const isNcDoc = url.includes('/nc');

  return (
    <div className="w-full h-full bg-[#0a0f1e] text-[#cbd5e1] overflow-y-auto animate-in slide-in-from-bottom-4 duration-500 font-sans">
      <div className="max-w-4xl mx-auto px-10 py-16">
        {/* Breadcrumbs */}
        <div className="flex gap-2 text-sm text-[#475569] mb-10 font-medium">
          <span className="hover:text-[#6366f1] cursor-default transition-colors">Documentation</span>
          <span>/</span>
          <span className="hover:text-[#6366f1] cursor-default transition-colors">System Utilities</span>
          <span>/</span>
          <span className="text-[#818cf8] font-semibold">{isTarDoc ? 'tar' : isNcDoc ? 'nc' : 'Guide'}</span>
        </div>

        {isTarDoc && (
          <article className="animate-in fade-in duration-700">
            <h1 className="text-5xl font-game text-[#f1f5f9] mb-8 tracking-tight drop-shadow-sm">
              tar <span className="text-[#6366f1] font-sans font-normal text-3xl opacity-60 ml-4">Archive Utility</span>
            </h1>
            <p className="text-xl text-[#94a3b8] mb-12 font-normal leading-relaxed">
              여러 파일이나 디렉토리를 하나의 아카이브 파일로 묶거나, 아카이브 파일의 압축을 해제하는 유틸리티입니다.
            </p>

            <section className="mb-14">
              <h2 className="text-2xl font-game text-[#f1f5f9] mb-6 border-b border-slate-800 pb-3">기본 구문</h2>
              <CodeBlock code="tar [옵션] [아카이브_이름].tar [파일1] [파일2] ..." />
            </section>

            <section className="mb-14">
              <h2 className="text-2xl font-game text-[#f1f5f9] mb-6">주요 옵션</h2>
              <ul className="space-y-6">
                <li className="flex items-start gap-6 group">
                  <code className="font-mono font-bold text-[#818cf8] bg-[#6366f1]/10 px-3 py-1 rounded-md transition-colors group-hover:bg-[#6366f1]/20">-c</code>
                  <div className="flex-1">
                    <span className="text-lg text-[#cbd5e1] font-normal leading-relaxed"><strong>Create</strong>: 새로운 아카이브를 생성합니다.</span>
                  </div>
                </li>
                <li className="flex items-start gap-6 group">
                  <code className="font-mono font-bold text-[#818cf8] bg-[#6366f1]/10 px-3 py-1 rounded-md transition-colors group-hover:bg-[#6366f1]/20">-v</code>
                  <div className="flex-1">
                    <span className="text-lg text-[#cbd5e1] font-normal leading-relaxed"><strong>Verbose</strong>: 작업 내용을 화면에 자세히 출력합니다.</span>
                  </div>
                </li>
                <li className="flex items-start gap-6 group">
                  <code className="font-mono font-bold text-[#818cf8] bg-[#6366f1]/10 px-3 py-1 rounded-md transition-colors group-hover:bg-[#6366f1]/20">-f</code>
                  <div className="flex-1">
                    <span className="text-lg text-[#cbd5e1] font-normal leading-relaxed"><strong>File</strong>: 아카이브 파일의 이름을 지정합니다. (항상 옵션의 마지막에 위치해야 함)</span>
                  </div>
                </li>
              </ul>
            </section>

            <div className="mt-20 p-8 bg-gradient-to-br from-[#1e1b4b]/40 to-[#0f172a]/40 border border-indigo-900/30 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50" />
              <h3 className="text-indigo-400 font-game text-xl mb-4 flex items-center gap-3">
                <span className="text-2xl">💡</span> Hint: 여러 파일 묶기
              </h3>
              <p className="text-lg text-[#94a3b8] font-normal leading-relaxed mb-6">
                특정 경로에 흩어져 있는 여러 파일들을 하나로 묶고 싶을 때, 뒤에 파일들을 나열할 수 있습니다.
              </p>
              <CodeBlock code="tar -cvf decoy.tar [파일_경로1] [파일_경로2] ..." />
            </div>
          </article>
        )}

        {isNcDoc && (
          <article className="animate-in fade-in duration-700">
            <h1 className="text-5xl font-game text-[#f1f5f9] mb-8 tracking-tight drop-shadow-sm">
              nc <span className="text-[#0ea5e9] font-sans font-normal text-3xl opacity-60 ml-4">Networking Tool (netcat)</span>
            </h1>
            <p className="text-xl text-[#94a3b8] mb-12 font-normal leading-relaxed">
              TCP 또는 UDP를 사용하여 네트워크 연결을 읽거나 쓰는 유틸리티입니다. 데이터 전송 및 디버깅에 널리 사용됩니다.
            </p>

            <section className="mb-14">
              <h2 className="text-2xl font-game text-[#f1f5f9] mb-6 border-b border-slate-800 pb-3">기본 구문</h2>
              <CodeBlock code="nc [옵션] [대상_IP] [포트]" />
            </section>

            <section className="mb-14">
              <h2 className="text-2xl font-game text-[#f1f5f9] mb-6">주요 옵션</h2>
              <ul className="space-y-6">
                <li className="flex items-start gap-6 group">
                  <code className="font-mono font-bold text-[#38bdf8] bg-[#0ea5e9]/10 px-3 py-1 rounded-md transition-colors group-hover:bg-[#0ea5e9]/20">-w [timeout]</code>
                  <div className="flex-1">
                    <span className="text-lg text-[#cbd5e1] font-normal leading-relaxed">연결 대기 시간을 초 단위로 설정합니다.</span>
                  </div>
                </li>
                <li className="flex items-start gap-6 group">
                  <code className="font-mono font-bold text-[#38bdf8] bg-[#0ea5e9]/10 px-3 py-1 rounded-md transition-colors group-hover:bg-[#0ea5e9]/20">&lt; [file]</code>
                  <div className="flex-1">
                    <span className="text-lg text-[#cbd5e1] font-normal leading-relaxed"><strong>Redirection</strong>: 파일의 내용을 표준 입력으로 전달하여 네트워크로 보냅니다.</span>
                  </div>
                </li>
              </ul>
            </section>

            <div className="mt-20 p-8 bg-gradient-to-br from-[#0c4a6e]/20 to-[#0f172a]/40 border border-sky-900/30 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-sky-500/50" />
              <h3 className="text-sky-400 font-game text-xl mb-4 flex items-center gap-3">
                <span className="text-2xl">💡</span> Hint: 파일 전송
              </h3>
              <p className="text-lg text-[#94a3b8] font-normal leading-relaxed mb-6">
                로컬에 있는 파일을 원격 서버로 전송할 때, 리다이렉션 기호를 사용하여 형식을 구성할 수 있습니다.
              </p>
              <CodeBlock code="nc [IP] [포트] < [파일명]" />
            </div>
          </article>
        )}

        {!isTarDoc && !isNcDoc && (
          <div className="py-20 text-center">
            <h1 className="text-2xl font-game text-slate-600">문서를 찾을 수 없습니다.</h1>
          </div>
        )}
      </div>

      <footer className="bg-[#0a0514] border-t border-slate-800/50 py-12 text-center text-sm text-[#475569]">
        <div className="mb-4 font-game opacity-60">VoidCity Systems Network Operations</div>
        <div className="opacity-40">&copy; 2026-2029 VoidCity Intelligence. All rights reserved.</div>
      </footer>
    </div>
  );
};
