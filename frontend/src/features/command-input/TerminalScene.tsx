import React, { useEffect, useRef, useState } from "react";
import { useClientStore } from "../../app/store/clientStore";
import { useWindowStore } from "../../app/store/windowStore";
import { useStoryRuntimeStore } from "../story-runtime/storyRuntime.store";
import { WindowFrame } from "../../shared/ui/WindowFrame";
import { DESKTOP_TASKBAR_HEIGHT, type DesktopWindowId } from "../../shared/config/desktopWindows";

interface TerminalSceneProps {
  windowId: DesktopWindowId;
}

export const TerminalScene: React.FC<TerminalSceneProps> = ({ windowId }) => {
  const { terminalOutput, appendTerminalOutput, terminalUser, terminalHost, terminalPath } = useClientStore();
  const windowState = useWindowStore((state) => state.windows.find((window) => window.id === windowId));
  const activeWindowId = useWindowStore((state) => state.activeWindowId);
  const { closeWindow, minimizeWindow, focusWindow, toggleMaximizeWindow } = useWindowStore();
  const { currentNode, submitStoryCommand } = useStoryRuntimeStore();
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const promptString = `${terminalUser}@${terminalHost}:${terminalPath}$`;
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
    const normalizedWhitespaceCommand = rawCommand.replace(/\s+/g, " ").trim();
    const command =
      currentNode?.code === "CH1_SSH_AUTH_PROMPT" && rawCommand.toLowerCase() === "yes"
        ? "YES"
        : currentNode?.code === "CH1_TERMINAL_SSH_READY" &&
            /^ssh\s+guest@172\.22\.4\.19$/.test(normalizedWhitespaceCommand)
          ? "ssh guest@172.22.4.19"
          : rawCommand;

    appendTerminalOutput("input", `${promptString} ${rawCommand}`);
    setInputValue("");
    setIsProcessing(true);

    try {
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

  if (!windowState) return null;

  const availableHeight = Math.max(0, window.innerHeight - DESKTOP_TASKBAR_HEIGHT);

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
      defaultSize={{ w: 700, h: 450 }}
      defaultPosition={{ x: window.innerWidth / 2 - 350, y: availableHeight / 2 - 225 }}
    >
      <div
        className="w-full h-full overflow-y-auto p-4 text-gray-200 font-mono text-sm terminal-scrollbar"
        onClick={() => {
          focusWindow(windowState.id);
          if (window.getSelection()?.toString() === "") {
            inputRef.current?.focus();
          }
        }}
      >
        {terminalOutput.map((output) => {
          if (output.type === "input" && output.text.startsWith(promptString)) {
            const commandText = output.text.slice(promptString.length);
            return (
              <div key={output.id} className="mb-1 whitespace-pre-wrap">
                <span className="text-green-500 mr-2" style={{ textShadow: "0 0 5px rgba(74, 222, 128, 0.4)" }}>
                  {promptString}
                </span>
                <span className="text-gray-200" style={{ textShadow: "none" }}>
                  {commandText.trimStart()}
                </span>
              </div>
            );
          }

          return (
            <div
              key={output.id}
              className={`mb-1 whitespace-pre-wrap ${
                output.type === "system"
                  ? "text-gray-400"
                  : "text-gray-200"
              }`}
            >
              {output.text}
            </div>
          );
        })}

        {!isProcessing ? (
          <div className="flex items-center mt-2">
            <span className="text-green-500 mr-2" style={{ textShadow: "0 0 5px rgba(74, 222, 128, 0.4)" }}>
              {promptString}
            </span>
            <form onSubmit={handleCommandSubmit} className="flex-1 flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                autoFocus
                className="flex-1 bg-transparent border-none outline-none text-gray-200 focus:ring-0 p-0"
                autoComplete="off"
                spellCheck="false"
                style={{ textShadow: "none" }}
              />
            </form>
          </div>
        ) : (
          <div className="flex items-center mt-2 text-gray-200">
            <span className="animate-pulse animate-duration-1000" style={{ textShadow: "none" }}>
              _
            </span>
          </div>
        )}
        <div ref={endOfOutputRef} />
      </div>
    </WindowFrame>
  );
};
