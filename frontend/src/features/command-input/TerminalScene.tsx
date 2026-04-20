import React, { useState, useRef, useEffect } from "react";
import { useClientStore } from "../../app/store/clientStore";
import { storyApi } from "../../shared/api/storyApi";
import { CustomClientException } from "../../shared/api/CustomClientException";
import { WindowFrame } from "../../shared/ui/WindowFrame";

// Note: In an actual Story runtime, nodeId would be passed from a server state / Story Engine.
// Using a mock nodeId for the current MVP integration.
const MOCK_CURRENT_NODE_ID = 1;

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
    terminalPath,
    setTerminalContext
  } = useClientStore();
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

    const command = inputValue.trim();
    appendTerminalOutput("input", `${promptString} ${command}`);
    setInputValue("");
    setIsProcessing(true);

    try {
      const response = await storyApi.submitTransition({
        nodeId: MOCK_CURRENT_NODE_ID,
        actionType: "command",
        inputValue: command,
        meta: { directory: terminalPath }, 
      });

      // Handle successful transition
      // The effects array instructs the UI what to show
      if (response.effects && response.effects.length > 0) {
        response.effects.forEach((effect) => {
          if (effect.type === "append_output" && effect.payload) {
            appendTerminalOutput("output", effect.payload);
          } else if (effect.type === "update_prompt") {
            // payload expected to be { user?: string, host?: string, path?: string }
            const payload = effect.payload || {};
            setTerminalContext(payload.user, payload.host, payload.path);
          }
          // Handle other effects...
        });
      } else if (response.nextNode?.outputBundle?.text) {
        // Fallback if the node has output text directly
        appendTerminalOutput("output", response.nextNode.outputBundle.text);
      } else {
         appendTerminalOutput("system", "[Command Executed]");
      }
    } catch (error: any) {
      // Handle RFC 9457 custom exceptions
      if (error instanceof CustomClientException) {
        appendTerminalOutput("error", `Error [${error.code}]: ${error.detail}`);
      } else {
        appendTerminalOutput("error", "System Error: Failed to execute command.");
      }
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
