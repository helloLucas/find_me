import React, { useEffect, useRef, useState } from "react";
import { useClientStore } from "../../app/store/clientStore";
import { useToastStore } from "../../app/store/toastStore";
import { useWindowStore } from "../../app/store/windowStore";
import { useBrowserContentStore } from "../../app/store/browserContentStore";
import { useStoryRuntimeStore } from "../story-runtime/storyRuntime.store";
import { canSubmitStoryAction } from "../story-runtime/storyActionGuards";
import { WindowFrame } from "../../shared/ui/WindowFrame";
import { storyApi } from "../../shared/api/storyApi";
import {
  DESKTOP_TASKBAR_HEIGHT,
  type DesktopWindowId,
} from "../../shared/config/desktopWindows";
import {
  shouldBlockUnavailableTerminalCommand,
  UNAVAILABLE_COMMAND_TOAST_MESSAGE,
} from "./terminalCommandFeedback";

interface TerminalSceneProps {
  windowId: DesktopWindowId;
}

const SSH_AUTH_PROMPT_NODE_CODE = "CH1_SSH_AUTH_PROMPT";
const SSH_AUTH_QUESTION = "Are you sure you want to continue connecting (yes/no)?";
const INLINE_PROMPT_INPUT_PREFIX = "__inline_prompt_input__:";

function isSshAuthQuestion(text: string) {
  return text.trim() === SSH_AUTH_QUESTION;
}

function toInlinePromptInput(command: string) {
  return `${INLINE_PROMPT_INPUT_PREFIX}${command}`;
}

function getInlinePromptInput(text: string) {
  return text.startsWith(INLINE_PROMPT_INPUT_PREFIX)
    ? text.slice(INLINE_PROMPT_INPUT_PREFIX.length)
    : undefined;
}

function splitPromptInput(text: string) {
  const match = text.match(/^([^@\s]+@[^:\s]+:[^\r\n$]+\$)\s*(.*)$/);
  if (!match) return undefined;

  return {
    prompt: match[1],
    command: match[2],
  };
}

export const TerminalScene: React.FC<TerminalSceneProps> = ({ windowId }) => {
  const {
    terminalOutput,
    appendTerminalOutput,
    terminalUser,
    terminalHost,
    terminalPath,
  } = useClientStore();
  const windowState = useWindowStore((state) =>
    state.windows.find((window) => window.id === windowId)
  );
  const activeWindowId = useWindowStore((state) => state.activeWindowId);
  const { closeWindow, minimizeWindow, focusWindow, toggleMaximizeWindow } =
    useWindowStore();
  const { currentNode, submitStoryCommand } = useStoryRuntimeStore();
  const showToast = useToastStore((state) => state.showToast);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  useEffect(() => {
    storyApi.getRecentCommands()
      .then((commands) => {
        setCommandHistory([...commands].reverse());
        setHistoryIndex(-1);
      })
      .catch((e) => {
        console.error("Failed to load command history", e);
      });
  }, []);

  const promptString = `${terminalUser}@${terminalHost}:${terminalPath}$`;
  const lastTerminalOutput = terminalOutput[terminalOutput.length - 1];
  const isSshAuthPromptActive =
    currentNode?.code === SSH_AUTH_PROMPT_NODE_CODE &&
    lastTerminalOutput?.type === "system" &&
    isSshAuthQuestion(lastTerminalOutput.text);
  const endOfOutputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endOfOutputRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalOutput]);

  useEffect(() => {
    if (!windowState || windowState.isMinimized || activeWindowId !== windowId) return;

    inputRef.current?.focus();
    if (terminalOutput.length === 0) {
      appendTerminalOutput("system", "Lucas OS Terminal initialized. Access restricted.");
      appendTerminalOutput("system", "Type commands to proceed...");
    }
  }, [windowState, activeWindowId, windowId, appendTerminalOutput, terminalOutput.length]);

  const handleCommandSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    const rawCommand = inputValue.trim();

    // 명령어 히스토리에 추가 및 인덱스 초기화
    setCommandHistory((prev) => [...prev, rawCommand]);
    setHistoryIndex(-1);

    let activeNode = useStoryRuntimeStore.getState().currentNode ?? currentNode;

    if (canSubmitStoryAction(activeNode, "click", "open_terminal")) {
      await useStoryRuntimeStore.getState().submitStoryClick("open_terminal");
      activeNode = useStoryRuntimeStore.getState().currentNode ?? activeNode;
    }

    const normalizedWhitespaceCommand = rawCommand.replace(/\s+/g, " ").trim();
    if (
      shouldBlockUnavailableTerminalCommand(activeNode?.code, rawCommand)
    ) {
      showToast(UNAVAILABLE_COMMAND_TOAST_MESSAGE);
      setInputValue("");
      setTimeout(() => inputRef.current?.focus(), 10);
      return;
    }

    const normalizedLowerCommand = normalizedWhitespaceCommand.toLowerCase();
    const isSshAuthNode = activeNode?.code === SSH_AUTH_PROMPT_NODE_CODE;
    const isSshAuthYes = isSshAuthNode && normalizedLowerCommand === "yes";
    const command = isSshAuthYes ? "YES" : rawCommand;

    appendTerminalOutput(
      "input",
      isSshAuthPromptActive ? toInlinePromptInput(rawCommand) : `${promptString} ${rawCommand}`
    );
    setInputValue("");

    setIsProcessing(true);

    try {
      if (!canSubmitStoryAction(activeNode, "command", command)) {
        const firstWord = rawCommand.split(" ")[0];
        appendTerminalOutput("error", `${firstWord}: command not found`);
        return;
      }

      await submitStoryCommand(command, { directory: terminalPath });

      const runtimeError = useStoryRuntimeStore.getState().error;
      if (runtimeError) {
        if (runtimeError.includes("409")) {
          const firstWord = rawCommand.split(" ")[0];
          appendTerminalOutput("error", `${firstWord}: command not found`);
        } else {
          appendTerminalOutput("error", runtimeError);
        }
      }
    } catch {
      appendTerminalOutput("error", "System Error: Failed to execute command.");
    } finally {
      setIsProcessing(false);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (commandHistory.length === 0) return;

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHistoryIndex((prevIndex) => {
        const nextIndex = prevIndex === -1 ? commandHistory.length - 1 : Math.max(0, prevIndex - 1);
        setInputValue(commandHistory[nextIndex]);
        return nextIndex;
      });
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setHistoryIndex((prevIndex) => {
        if (prevIndex === -1) return -1;
        const nextIndex = prevIndex + 1;
        if (nextIndex >= commandHistory.length) {
          setInputValue("");
          return -1;
        } else {
          setInputValue(commandHistory[nextIndex]);
          return nextIndex;
        }
      });
    }
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    const pastedText = event.clipboardData.getData("text");
    const lastCopiedCommand = useBrowserContentStore.getState().lastCopiedCommand;

    // 복사된 명령어가 없거나, 붙여넣으려는 텍스트가 마지막으로 복사된 '허용된' 명령어와 다르면 차단
    if (!lastCopiedCommand || pastedText !== lastCopiedCommand) {
      event.preventDefault();
      showToast("보안 정책상 허용된 명령어 외에는 붙여넣기가 제한됩니다.");
    }
  };

  if (!windowState) return null;

  const availableHeight = Math.max(0, window.innerHeight - DESKTOP_TASKBAR_HEIGHT);
  const defaultTerminalSize = { w: 800, h: 450 };

  return (
    <WindowFrame
      title={promptString}
      zIndex={windowState.zIndex}
      onClose={() => closeWindow(windowState.id)}
      onMinimize={() => minimizeWindow(windowState.id)}
      onFocus={() => focusWindow(windowState.id)}
      onToggleMaximize={() => toggleMaximizeWindow(windowState.id)}
      isMinimized={windowState.isMinimized}
      isMaximized={windowState.isMaximized}
      defaultSize={defaultTerminalSize}
      defaultPosition={{
        x: window.innerWidth / 2 - defaultTerminalSize.w / 2,
        y: availableHeight / 2 - defaultTerminalSize.h / 2,
      }}
    >
      <div
        className="w-full h-full overflow-y-auto p-4 text-gray-400 font-terminal text-xs leading-tight terminal-scrollbar"
        onClick={() => {
          focusWindow(windowState.id);
          if (window.getSelection()?.toString() === "") {
            inputRef.current?.focus();
          }
        }}
      >
        {terminalOutput.map((output, index) => {
          const inlineInput =
            output.type === "input" ? getInlinePromptInput(output.text) : undefined;
          if (inlineInput !== undefined) {
            return null;
          }

          const nextOutput = terminalOutput[index + 1];
          const inlineAnswer =
            nextOutput?.type === "input" ? getInlinePromptInput(nextOutput.text) : undefined;

          if (output.type === "system" && isSshAuthQuestion(output.text)) {
            if (inlineAnswer !== undefined) {
              return (
                <div key={output.id} className="mb-1 whitespace-pre-wrap text-gray-400">
                  {output.text} {inlineAnswer}
                </div>
              );
            }

            if (isSshAuthPromptActive && index === terminalOutput.length - 1) {
              return (
                <div key={output.id} className="mb-1 flex flex-wrap items-baseline text-gray-400">
                  <span className="whitespace-pre-wrap">{output.text}</span>
                  <form
                    onSubmit={handleCommandSubmit}
                    className="ml-1 inline-flex min-w-20 flex-1 items-center"
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(event) => setInputValue(event.target.value)}
                      autoFocus
                      className="min-w-20 flex-1 bg-transparent border-none outline-none text-gray-400 focus:ring-0 p-0"
                      autoComplete="off"
                      spellCheck="false"
                      style={{ textShadow: "none" }}
                      onPaste={handlePaste}
                      onKeyDown={handleKeyDown}
                    />
                  </form>
                </div>
              );
            }
          }

          const promptInput = output.type === "input" ? splitPromptInput(output.text) : undefined;
          if (promptInput) {
            return (
              <div key={output.id} className="mb-1 whitespace-pre-wrap">
                <span
                  className="text-green-500 mr-2"
                  style={{ textShadow: "0 0 5px rgba(74, 222, 128, 0.4)" }}
                >
                  {promptInput.prompt}
                </span>
                <span className="text-gray-400" style={{ textShadow: "none" }}>
                  {promptInput.command}
                </span>
              </div>
            );
          }

          return (
            <div key={output.id} className="mb-1 whitespace-pre-wrap text-gray-400">
              {output.text}
            </div>
          );
        })}

        {!isSshAuthPromptActive && !isProcessing ? (
          <div className="flex items-center mt-2">
            <span
              className="text-green-500 mr-2"
              style={{ textShadow: "0 0 5px rgba(74, 222, 128, 0.4)" }}
            >
              {promptString}
            </span>
            <form onSubmit={handleCommandSubmit} className="flex-1 flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                autoFocus
                className="flex-1 bg-transparent border-none outline-none text-gray-400 focus:ring-0 p-0"
                autoComplete="off"
                spellCheck="false"
                style={{ textShadow: "none" }}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
              />
            </form>
          </div>
        ) : !isSshAuthPromptActive ? (
          <div className="flex items-center mt-2 text-gray-400">
            <span className="animate-pulse animate-duration-1000" style={{ textShadow: "none" }}>
              _
            </span>
          </div>
        ) : null}
        <div ref={endOfOutputRef} />
      </div>
    </WindowFrame>
  );
};
