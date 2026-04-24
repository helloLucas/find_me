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
        appendTerminalOutput("error", runtimeError);
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
        className="w-full h-full overflow-y-auto p-4 text-green-400 font-mono text-sm terminal-scrollbar"
        onClick={() => {
          focusWindow(windowState.id);
          if (window.getSelection()?.toString() === "") {
            inputRef.current?.focus();
          }
        }}
      >
        {terminalOutput.map((output) => (
          <div
            key={output.id}
            className={`mb-1 whitespace-pre-wrap ${
              output.type === "error"
                ? "text-red-500"
                : output.type === "system"
                  ? "text-gray-400 italic"
                  : "text-green-400"
            }`}
            style={{ textShadow: "0 0 5px rgba(74, 222, 128, 0.4)" }}
          >
            {output.text}
          </div>
        ))}

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
                className="flex-1 bg-transparent border-none outline-none text-green-400 focus:ring-0 p-0"
                autoComplete="off"
                spellCheck="false"
                style={{ textShadow: "0 0 5px rgba(74, 222, 128, 0.4)" }}
              />
            </form>
          </div>
        ) : (
          <div className="flex items-center mt-2 text-green-500">
            <span className="animate-pulse animate-duration-1000" style={{ textShadow: "0 0 5px rgba(74, 222, 128, 0.4)" }}>
              _
            </span>
          </div>
        )}
        <div ref={endOfOutputRef} />
      </div>
    </WindowFrame>
  );
};
