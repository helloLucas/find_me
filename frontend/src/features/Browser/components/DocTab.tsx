import React, { useState } from "react";
import { useBrowserContentStore } from "../../../app/store/browserContentStore";
import { useClipboardStore } from "../../../app/store/clipboardStore";

interface DocTabProps {
  url: string;
}

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const setLastCopiedCommand = useBrowserContentStore((state) => state.setLastCopiedCommand);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setLastCopiedCommand(code);
      useClipboardStore.getState().setClipboardText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="group relative overflow-hidden rounded-md border border-[#543ab7]/35 bg-[#05020c] p-4 shadow-[0_0_18px_rgba(84,58,183,0.12)]">
      <code className="block whitespace-pre-wrap break-words font-browser-code text-sm leading-relaxed text-[#ffe259]">
        {code}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-3 rounded border border-[#543ab7]/50 bg-[#110a26] px-2 py-1 font-browser-content text-[11px] text-[#a48cff] opacity-0 transition-all hover:border-[#a48cff] hover:text-white group-hover:opacity-100"
        title="클립보드에 복사"
      >
        {copied ? "복사됨" : "복사"}
      </button>
    </div>
  );
};

const OptionRow: React.FC<{ option: string; children: React.ReactNode }> = ({ option, children }) => (
  <li className="flex items-start gap-4">
    <code className="min-w-16 rounded border border-[#543ab7]/35 bg-[#543ab7]/10 px-2 py-1 text-center font-browser-code text-sm font-semibold text-[#ffe259]">
      {option}
    </code>
    <p className="pt-0.5 text-sm leading-7 text-[#c7b3ff]">{children}</p>
  </li>
);

export const DocTab: React.FC<DocTabProps> = ({ url }) => {
  const isTarDoc = url.includes("/tar");
  const isNcDoc = url.includes("/nc");

  return (
    <div className="h-full w-full overflow-y-auto bg-[#080512] font-browser-content text-[#c7b3ff] terminal-scrollbar">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <nav className="mb-8 flex gap-2 font-browser-code text-xs text-[#6b5eb1]">
          <span>문서</span>
          <span>/</span>
          <span>시스템 유틸리티</span>
          <span>/</span>
          <span className="text-[#a48cff]">{isTarDoc ? "tar" : isNcDoc ? "nc" : "guide"}</span>
        </nav>

        {isTarDoc && (
          <article className="space-y-10">
            <header className="border-b border-[#543ab7]/30 pb-6">
              <h1 className="font-browser-heading text-3xl font-bold tracking-tight text-[#f1f5f9]">
                tar 명령어
              </h1>
              <p className="mt-4 text-base leading-8 text-[#9ca3c7]">
                여러 파일이나 디렉터리를 하나의 아카이브 파일로 묶을 때 사용하는 유틸리티입니다.
                챕터 2에서는 미끼 파일을 하나로 포장하는 용도로 확인할 수 있습니다.
              </p>
            </header>

            <section>
              <h2 className="mb-4 font-browser-heading text-xl font-semibold text-[#f1f5f9]">기본 형식</h2>
              <CodeBlock code="tar [옵션] [아카이브_이름].tar [파일1] [파일2] ..." />
            </section>

            <section>
              <h2 className="mb-4 font-browser-heading text-xl font-semibold text-[#f1f5f9]">주요 옵션</h2>
              <ul className="space-y-4">
                <OptionRow option="-c">새로운 아카이브 파일을 생성합니다.</OptionRow>
                <OptionRow option="-v">처리 중인 파일 목록을 화면에 출력합니다.</OptionRow>
                <OptionRow option="-f">생성하거나 읽을 아카이브 파일 이름을 지정합니다.</OptionRow>
              </ul>
            </section>

            <section className="rounded-md border border-[#4ce2fc]/30 bg-[#0d071c] p-5">
              <h2 className="mb-3 font-browser-heading text-lg font-semibold text-[#4ce2fc]">참고</h2>
              <p className="mb-4 text-sm leading-7 text-[#9ca3c7]">
                여러 개의 흔적 파일을 하나로 묶을 때는 대상 파일을 명령어 끝에 나열하면 됩니다.
              </p>
              <CodeBlock code="tar -cvf decoy.tar [파일_경로1] [파일_경로2] ..." />
            </section>
          </article>
        )}

        {isNcDoc && (
          <article className="space-y-10">
            <header className="border-b border-[#543ab7]/30 pb-6">
              <h1 className="font-browser-heading text-3xl font-bold tracking-tight text-[#f1f5f9]">
                nc 명령어
              </h1>
              <p className="mt-4 text-base leading-8 text-[#9ca3c7]">
                Netcat은 TCP 또는 UDP 연결을 만들고 데이터를 보내는 데 사용하는 네트워크 도구입니다.
                파일 내용을 표준 입력으로 넘겨 원격 포트에 전달할 수 있습니다.
              </p>
            </header>

            <section>
              <h2 className="mb-4 font-browser-heading text-xl font-semibold text-[#f1f5f9]">기본 형식</h2>
              <CodeBlock code="nc [옵션] [대상 IP] [포트]" />
            </section>

            <section>
              <h2 className="mb-4 font-browser-heading text-xl font-semibold text-[#f1f5f9]">주요 사용법</h2>
              <ul className="space-y-4">
                <OptionRow option="-w">연결 대기 시간을 초 단위로 제한합니다.</OptionRow>
                <OptionRow option="<">파일 내용을 표준 입력으로 전달해 네트워크로 보냅니다.</OptionRow>
              </ul>
            </section>

            <section className="rounded-md border border-[#4ce2fc]/30 bg-[#0d071c] p-5">
              <h2 className="mb-3 font-browser-heading text-lg font-semibold text-[#4ce2fc]">참고</h2>
              <p className="mb-4 text-sm leading-7 text-[#9ca3c7]">
                로컬에 있는 파일을 지정된 서버 포트로 전송할 때는 리다이렉션 기호를 함께 사용합니다.
              </p>
              <CodeBlock code="nc -w 3 [IP] [포트] < [파일명]" />
            </section>
          </article>
        )}

        {!isTarDoc && !isNcDoc && (
          <div className="py-20 text-center">
            <h1 className="font-browser-heading text-2xl text-[#6b5eb1]">문서를 찾을 수 없습니다.</h1>
          </div>
        )}
      </main>

      <footer className="border-t border-[#543ab7]/20 bg-[#05020c] py-8 text-center font-browser-code text-xs text-[#6b5eb1]">
        VoidCity Systems Network Operations
      </footer>
    </div>
  );
};
