import React, { useState, useRef, useEffect } from "react";
import { useClientStore } from "../../app/store/clientStore";
import { useStoryRuntimeStore } from "../story-runtime/storyRuntime.store";
import { WindowFrame } from "../../shared/ui/WindowFrame";

export const TerminalScene: React.FC = () => {
  const { 
    isTerminalOpen, 
    isTerminalMinimized, 
    closeTerminal, 
    minimizeTerminal, 
    terminalOutput, 
    appendTerminalOutput,
    terminalUser,
    terminalHost,
    terminalPath
  } = useClientStore();
  const { currentNode, submitStoryCommand } = useStoryRuntimeStore();
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Dynamic Prompt String
  const promptString = `${terminalUser}@${terminalHost}:${terminalPath}$`;
  
  const endOfOutputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of terminal
  useEffect(() => {
    endOfOutputRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalOutput]);

  // Focus input when terminal opens
  useEffect(() => {
    if (isTerminalOpen && !isTerminalMinimized) {
      inputRef.current?.focus();
      // Print welcome message if empty
      if (terminalOutput.length === 0) {
        appendTerminalOutput("system", "Lucas OS Terminal initialized. Access restricted.");
        appendTerminalOutput("system", "Type commands to proceed...");
      }
    }
  }, [isTerminalOpen, isTerminalMinimized, appendTerminalOutput, terminalOutput.length]);

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // Keep focus on input
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  if (!isTerminalOpen) return null;

  return (
    <WindowFrame
      title={promptString}
      onClose={closeTerminal}
      onMinimize={minimizeTerminal}
      isMinimized={isTerminalMinimized}
      defaultSize={{ w: 700, h: 450 }}
      defaultPosition={{ x: window.innerWidth / 2 - 350, y: window.innerHeight / 2 - 225 }}
    >
      {/* Terminal Body */}
      <div 
        className="w-full h-full overflow-y-auto p-4 text-green-400 font-mono text-sm terminal-scrollbar" 
        onClick={() => {
          // Only focus the input if the user hasn't highlighted/selected text
          if (window.getSelection()?.toString() === "") {
            inputRef.current?.focus();
          }
        }}
      >
        {terminalOutput.map((out) => (
          <div 
            key={out.id} 
            className={`mb-1 whitespace-pre-wrap ${
              out.type === "error" ? "text-red-500" : 
              out.type === "system" ? "text-gray-400 italic" : "text-green-400"
            }`}
            style={{ textShadow: "0 0 5px rgba(74, 222, 128, 0.4)" }}
          >
            {out.text}
          </div>
        ))}

        {/* Input line - Only display when not processing to mimic real terminal behavior */}
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
                onChange={(e) => setInputValue(e.target.value)}
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
            <span className="animate-pulse animate-duration-1000" style={{ textShadow: "0 0 5px rgba(74, 222, 128, 0.4)" }}>_</span>
          </div>
        )}
        <div ref={endOfOutputRef} />
      </div>
    </WindowFrame>
  );
};
