import React, { useEffect, useMemo, useRef, useState } from "react";
import { useBrowserContentStore } from "../../../app/store/browserContentStore";
import { useToastStore } from "../../../app/store/toastStore";
import { useStoryRuntimeStore } from "../../story-runtime/storyRuntime.store";
import {
  canSubmitStoryAction,
  getStoryInspectTarget,
} from "../../story-runtime/storyActionGuards";
import {
  objectRecord,
  recordArray,
  stringValue,
} from "../../story-runtime/outputBundle.adapters";

type DevToolsTab = "elements" | "network" | "console";
type DetailTab = "Headers" | "Response";
type ConsoleEntryType = "in" | "out" | "error" | "success";

interface Log {
  id: string;
  status: number;
  method: string;
  name: string;
  path?: string;
  domain: string;
  timeMs: number;
  size: string;
  selected?: boolean;
}

interface ConsoleEntry {
  id: number;
  type: ConsoleEntryType;
  text: string;
}

const CORE_ANCHOR_LOG: Log = {
  id: "req_037",
  status: 200,
  method: "GET",
  name: "core_anchor",
  path: "/api/laplace/core_anchor",
  domain: "api.nexus-news.net",
  timeMs: 187,
  size: "1.9 KB",
};

const FALLBACK_LOGS: Log[] = [
  CORE_ANCHOR_LOG,
  { id: "req_029", status: 404, method: "GET", name: "track.js", domain: "cdn.nexus-news.net", timeMs: 23, size: "0.4 KB" },
  { id: "req_030", status: 404, method: "GET", name: "analytics/ping.gif", domain: "metrics.nexus-news.net", timeMs: 41, size: "0.2 KB" },
  { id: "req_031", status: 404, method: "GET", name: "ads.js", domain: "static.nexus-news.net", timeMs: 18, size: "0.5 KB" },
];

export const NetworkDevTools: React.FC = () => {
  const {
    currentNode,
    isLoading,
    submitStoryClick,
    submitStoryInspect,
    submitStoryCommand,
  } = useStoryRuntimeStore();
  const showToast = useToastStore((state) => state.showToast);
  const { content: persistedContent, isChapter2Mode, lastCopiedCommand } = useBrowserContentStore();

  const [activeTab, setActiveTab] = useState<DevToolsTab>("elements");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("Headers");
  const [consoleInput, setConsoleInput] = useState("");
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([
    {
      id: 0,
      type: "error",
      text: "Failed to load resource: the server responded with a status of 404 (Not Found)",
    },
  ]);
  const nextConsoleEntryIdRef = useRef(1);
  const seenConsoleLogKeysRef = useRef(new Set<string>());
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const currentScene = objectRecord(currentNode?.outputBundle?.scene) ?? {};
  const currentSceneMode = stringValue(currentScene.mode);
  const shouldApplyCurrentContent =
    currentNode?.nodeType === "network" || currentSceneMode === "network";
  const currentContent = objectRecord(currentNode?.outputBundle?.content) ?? {};
  const content = useMemo(
    () => ({
      ...persistedContent,
      ...(shouldApplyCurrentContent ? currentContent : {}),
    }),
    [currentContent, persistedContent, shouldApplyCurrentContent]
  );

  const rawHeaders = objectRecord(content.headers) ?? {};
  const rawResponseBody = content.responseBody;
  const headers = rawHeaders;
  const responseBody = rawResponseBody;

  const logs = useMemo(() => {
    let requests = recordArray(content.networkRequests).map(normalizeNetworkLog);
    
    // 챕터 2일 경우 모든 로그의 상태를 200으로 강제
    if (isChapter2Mode) {
      requests = (requests.length > 0 ? requests : FALLBACK_LOGS).map(log => ({
        ...log,
        status: 200
      }));
      return requests;
    }

    if (requests.length > 0) return requests;
    if (Object.keys(headers).length > 0 || responseBody) return [CORE_ANCHOR_LOG];
    return FALLBACK_LOGS;
  }, [content.networkRequests, isChapter2Mode, headers, responseBody]);

  const selectedLog = logs.find((log) => log.id === selectedLogId) ?? null;
  const consoleLogs = Array.isArray(content.consoleLogs) ? content.consoleLogs.map(String) : [];
  const detailTabs = normalizeDetailTabs(content.detailTabs);
  const inspectTarget = getStoryInspectTarget(currentNode);
  const canInspectResponse =
    responseBody !== undefined &&
    inspectTarget != null &&
    canSubmitStoryAction(currentNode, "inspect", inspectTarget);

  useEffect(() => {
    if (currentNode?.code === "CH1_RELAY_CLUE_REVISIT") {
      // 강아지가 주소를 다시 찾으라고 한 직후: Network 탭 전환 + 선택/탭 초기화
      // → 플레이어가 req_037 클릭 → Response 탭 직접 눌러야 주소 확인 가능
      setActiveTab("network");
      setDetailTab("Headers");
      setSelectedLogId(null);
      return;
    }

    // 현재 노드 own-content에 selected:true가 명시된 경우에만 자동 선택
    // (그 외에는 사용자의 현재 선택 상태를 유지한다)
    const ownContent = objectRecord(currentNode?.outputBundle?.content) ?? {};
    const ownLogs = recordArray(ownContent.networkRequests).map(normalizeNetworkLog);
    const autoSelected = ownLogs.find((log) => log.selected);
    if (autoSelected) {
      setSelectedLogId(autoSelected.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNode?.code]);


  useEffect(() => {
    if (detailTab !== "Response") return;
    if (inspectTarget !== "packet_message") return;
    if (!canSubmitStoryAction(currentNode, "inspect", "packet_message")) return;

    const timer = window.setTimeout(() => {
      void submitStoryInspect("packet_message");
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [currentNode, detailTab, inspectTarget, submitStoryInspect]);

  useEffect(() => {
    if (!shouldApplyCurrentContent) return;

    const unseenConsoleEntries = consoleLogs.reduce<ConsoleEntry[]>((entries, text, index) => {
      const key = `${index}:${text}`;
      if (seenConsoleLogKeysRef.current.has(key)) {
        return entries;
      }

      seenConsoleLogKeysRef.current.add(key);
      entries.push({
        id: nextConsoleEntryIdRef.current++,
        type: "out",
        text,
      });
      return entries;
    }, []);

    if (unseenConsoleEntries.length === 0) return;

    setConsoleEntries((prev) => [...prev, ...unseenConsoleEntries]);
  }, [consoleLogs, shouldApplyCurrentContent]);

  useEffect(() => {
    if (activeTab !== "console") return;

    const animationFrame = window.requestAnimationFrame(() => {
      consoleEndRef.current?.scrollIntoView({ block: "end" });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeTab, consoleEntries]);

  const appendConsoleEntry = (type: ConsoleEntryType, text: string) => {
    setConsoleEntries((prev) => [
      ...prev,
      {
        id: nextConsoleEntryIdRef.current++,
        type,
        text,
      },
    ]);
  };

  const handleNetworkTabClick = () => {
    setActiveTab("network");
    if (canSubmitStoryAction(currentNode, "click", "network_tab")) {
      void submitStoryClick("network_tab");
    }
  };

  const handleRequestClick = (log: Log) => {
    setSelectedLogId(log.id);
    if (canSubmitStoryAction(currentNode, "click", log.id)) {
      void submitStoryClick(log.id);
    }
  };

  const handleDetailTabClick = (tab: DetailTab) => {
    setDetailTab(tab);
    if (
      inspectTarget === "headers_or_response" &&
      canSubmitStoryAction(currentNode, "inspect", inspectTarget)
    ) {
      void submitStoryInspect(inspectTarget);
    }
  };

  const handleInspectResponse = () => {
    if (inspectTarget && canSubmitStoryAction(currentNode, "inspect", inspectTarget)) {
      void submitStoryInspect(inspectTarget);
    }
  };

  const handleConsoleSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !consoleInput.trim()) return;

    const command = consoleInput.trim();
    setConsoleInput("");
    appendConsoleEntry("in", command);

    if (isLoading) {
      appendConsoleEntry("error", "System is busy processing a previous task...");
      return;
    }

    let node = useStoryRuntimeStore.getState().currentNode;

    // 터미널용 명령어가 브라우저 콘솔에서 실행되어 스토리가 진행되는 것을 방지
    const terminalCommands = ["ls", "cd", "tar", "nc", "cat", "pwd", "rm", "cp", "mv", "ssh", "mkdir"];
    const firstWord = command.split(" ")[0].toLowerCase();
    if (terminalCommands.includes(firstWord)) {
      appendConsoleEntry("error", `Uncaught ReferenceError: ${firstWord} is not defined`);
      return;
    }

    // 챕터 1 전용 커맨드 예외 처리
    if (command === "connect_core()" && !isChapter2Mode && node?.code === "CH1_PACKET_MESSAGE") {
      if (canSubmitStoryAction(node, "click", "go_to_console")) {
        await submitStoryClick("go_to_console");
        node = useStoryRuntimeStore.getState().currentNode;
      }
    }

    if (canSubmitStoryAction(node, "command", command)) {
      await submitStoryCommand(command);
      
      // 챕터 2에서는 "Command executed." 메시지 출력 방지 (시스템 메시지 성격 배제)
      if (!isChapter2Mode) {
        appendConsoleEntry("success", "Command executed.");
      }
      return;
    }

    // 챕터 2에서 connect_core() 시도 시 정의되지 않음 에러 출력
    if (isChapter2Mode && command === "connect_core()") {
       appendConsoleEntry("error", `Uncaught ReferenceError: ${command} is not defined`);
       return;
    }

    appendConsoleEntry("error", `Uncaught ReferenceError: ${command} is not defined`);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    // 챕터 2 모드에서만 붙여넣기 제한 적용
    if (!isChapter2Mode) return;

    const pastedText = e.clipboardData.getData("text");

    // 복사된 명령어가 없거나, 붙여넣으려는 텍스트가 마지막으로 복사된 '허용된' 명령어와 다르면 차단
    if (!lastCopiedCommand || pastedText !== lastCopiedCommand) {
      e.preventDefault();
      showToast("보안 정책상 허용된 명령어 외에는 붙여넣기가 제한됩니다.");
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#242424] border-l border-[#444] font-sans text-[12px] text-[#cccccc] pointer-events-auto shadow-[-5px_0_15px_rgba(0,0,0,0.5)] z-[1000] relative overflow-hidden">
      <div className="flex items-center bg-[#1e1e1e] border-b border-[#333] px-2 h-7 flex-shrink-0">
        <button
          className={`px-3 py-1 ${activeTab === "elements" ? "border-b-2 border-[#5394fb] text-white" : "text-[#888] hover:text-[#ccc]"}`}
          onClick={() => setActiveTab("elements")}
        >
          Elements
        </button>
        <button
          className={`px-3 py-1 ${activeTab === "network" ? "border-b-2 border-[#5394fb] text-white" : "text-[#888] hover:text-[#ccc]"}`}
          onClick={handleNetworkTabClick}
        >
          Network
        </button>
        <button
          className={`px-3 py-1 ${activeTab === "console" ? "border-b-2 border-[#5394fb] text-white" : "text-[#888] hover:text-[#ccc]"}`}
          onClick={() => setActiveTab("console")}
        >
          Console
        </button>
      </div>

      {activeTab === "elements" && (
        <div className="flex-1 overflow-y-auto bg-[#1e1e1e] p-3 font-mono text-[11px] text-[#888]">
          <div>&lt;article data-render-state="corrupted"&gt;</div>
          <div className="pl-4 text-[#ccc]">Open Network to inspect blocked requests.</div>
          <div>&lt;/article&gt;</div>
        </div>
      )}

      {activeTab === "console" && (
        <div className="flex-1 p-2 font-mono text-xs overflow-y-auto bg-[#1e1e1e] flex flex-col">
          <div className="border-b border-[#333] pb-1 mb-1 opacity-50 flex-shrink-0">top</div>
          <div className="flex-1 flex flex-col gap-1 overflow-y-auto pb-2">
            {consoleEntries.map((item) => (
              <div key={item.id} className={`
                ${item.type === "in" ? "text-[#ccc]" : ""}
                ${item.type === "error" ? "text-red-400 bg-red-900/10 px-1 border-l-2 border-red-500" : ""}
                ${item.type === "success" ? "text-green-400 bg-green-900/10 px-1 border-l-2 border-green-500" : ""}
                ${item.type === "out" ? "text-[#888]" : ""}
              `}>
                {item.type === "in" ? "> " : ""}{item.text}
              </div>
            ))}
            <div ref={consoleEndRef} />
          </div>
          <div className="flex items-center text-[#5394fb] mt-2 shrink-0">
            <span className="mr-2">&gt;</span>
            <input
              type="text"
              className="flex-1 bg-transparent outline-none text-[#ccc]"
              value={consoleInput}
              onChange={(e) => setConsoleInput(e.target.value)}
              onKeyDown={handleConsoleSubmit}
              onPaste={handlePaste}
              autoFocus
              spellCheck={false}
            />
          </div>
        </div>
      )}

      {activeTab === "network" && (
        <div className="flex-1 flex flex-row overflow-hidden relative bg-[#1e1e1e]">
          <div className={`flex-1 overflow-x-auto overflow-y-auto ${selectedLog ? "border-r border-[#444] hidden md:block" : ""}`}>
            <table className="min-w-full text-left table-fixed whitespace-nowrap font-mono text-[11px]">
              <thead className="sticky top-0 z-10 bg-[#2d2d2d] text-[#ccc] border-b border-[#444]">
                <tr>
                  <th className="w-12 px-2 py-1 font-normal border-r border-[#444] bg-[#2d2d2d]">Status</th>
                  <th className="w-12 px-2 py-1 font-normal border-r border-[#444] bg-[#2d2d2d]">Method</th>
                  <th className="px-2 py-1 font-normal border-r border-[#444] w-28 bg-[#2d2d2d]">Name</th>
                  <th className="px-2 py-1 font-normal border-r border-[#444] w-32 bg-[#2d2d2d]">Domain</th>
                  <th className="w-12 px-2 py-1 font-normal border-r border-[#444] bg-[#2d2d2d]">Time</th>
                  <th className="w-12 px-2 py-1 font-normal bg-[#2d2d2d]">Size</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className={`border-b border-[#333] cursor-pointer hover:bg-[#2a2d2e] ${selectedLog?.id === log.id ? "bg-[#094771] text-white" : ""}`}
                    onClick={() => handleRequestClick(log)}
                  >
                    <td className="px-2 py-0.5 flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${log.status === 200 ? "bg-[#3fb950]" : "bg-[#f85149]"}`} />
                      <span className={selectedLog?.id === log.id ? "text-white" : log.status === 200 ? "text-[#3fb950]" : "text-[#f85149]"}>{log.status}</span>
                    </td>
                    <td className="px-2 py-0.5">{log.method}</td>
                    <td className="px-2 py-0.5 truncate" title={log.name}>{log.name}</td>
                    <td className="px-2 py-0.5 text-[#a8a8a8] truncate" title={log.domain}>{log.domain}</td>
                    <td className="px-2 py-0.5">{log.timeMs} ms</td>
                    <td className="px-2 py-0.5">{log.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedLog && (
            <div className="w-full md:w-[300px] flex-shrink-0 flex flex-col bg-[#242424]">
              <div className="flex items-center px-2 py-1 border-b border-[#444] bg-[#2d2d2d] gap-2 shrink-0">
                <button
                  className="w-4 h-4 flex items-center justify-center hover:bg-[#444] rounded text-lg"
                  onClick={() => setSelectedLogId(null)}
                >x</button>
                <span className="truncate flex-1 font-bold text-white text-[12px]">{selectedLog.name}</span>
              </div>

              <div className="flex items-center border-b border-[#444] bg-[#242424] px-2 h-7 shrink-0 text-[11px]">
                {detailTabs.map((tab) => (
                  <button
                    key={tab}
                    className={`px-3 py-1 h-full ${detailTab === tab ? "border-b-2 border-[#5394fb] text-white" : "text-[#888] hover:text-[#ccc]"}`}
                    onClick={() => handleDetailTabClick(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-2 text-[11px] leading-relaxed">
                {detailTab === "Headers" && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <div className="font-bold text-[#ccc] mb-1">General</div>
                      <div className="pl-3 flex flex-col gap-1">
                        <div className="flex"><span className="w-24 text-[#888]">Request URL:</span><span className="flex-1 break-all text-white">{buildRequestUrl(selectedLog)}</span></div>
                        <div className="flex"><span className="w-24 text-[#888]">Request Method:</span><span className="flex-1 text-white">{selectedLog.method}</span></div>
                        <div className="flex"><span className="w-24 text-[#888]">Status Code:</span><span className="flex-1 flex items-center gap-1 text-white"><div className={`w-2 h-2 rounded-full ${selectedLog.status === 200 ? "bg-[#3fb950]" : "bg-[#f85149]"}`}/> {selectedLog.status}</span></div>
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-[#ccc] mb-1">Response Headers</div>
                      <div className="pl-3 flex flex-col gap-1">
                        {Object.keys(headers).length > 0 ? (
                          Object.entries(headers).map(([key, value]) => (
                            <div className="flex" key={key}>
                              <span className="w-32 text-[#888]">{key}:</span>
                              <span className="flex-1 text-white">{String(value)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-[#888]">Select Headers or Response to decode this packet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {detailTab === "Response" && (
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      className={`font-mono text-left text-[#a5d6ff] whitespace-pre-wrap break-all p-1 bg-[#0d1117] border border-[#30363d] rounded ${
                        canInspectResponse
                          ? "cursor-pointer hover:bg-[#1a2333] hover:border-[#0ff] hover:text-[#0ff] transition-all hover:shadow-[0_0_8px_rgba(0,255,255,0.4)]"
                          : "cursor-default"
                      }`}
                      onClick={canInspectResponse ? handleInspectResponse : undefined}
                      disabled={!canInspectResponse}
                    >
                      {responseBody ? formatJson(responseBody) : '{"status":"pending","payload":"encrypted"}'}
                    </button>
                    {consoleLogs.map((line, idx) => (
                      <div key={idx} className="font-mono text-[#f0c674]">
                        {line}
                      </div>
                    ))}
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

function normalizeNetworkLog(raw: Record<string, unknown>): Log {
  return {
    id: stringValue(raw.id) ?? "req_unknown",
    status: Number(raw.status ?? 0),
    method: stringValue(raw.method) ?? "GET",
    name: stringValue(raw.name) ?? "unknown",
    path: stringValue(raw.path),
    domain: stringValue(raw.domain) ?? "api.nexus-news.net",
    timeMs: Number(raw.timeMs ?? 0),
    size: stringValue(raw.size) ?? "0 KB",
    selected: raw.selected === true,
  };
}

function normalizeDetailTabs(value: unknown): DetailTab[] {
  if (!Array.isArray(value)) return ["Headers", "Response"];
  const tabs = value.filter((tab): tab is DetailTab => tab === "Headers" || tab === "Response");
  return tabs.length > 0 ? tabs : ["Headers", "Response"];
}

function buildRequestUrl(log: Log) {
  return `https://${log.domain}${log.path ?? `/${log.name}`}`;
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
