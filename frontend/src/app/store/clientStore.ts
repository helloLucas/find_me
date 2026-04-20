import { create } from "zustand";

interface ClientState {
  // Terminal UI State
  isTerminalOpen: boolean;
  isTerminalMinimized: boolean;
  terminalUser: string;
  terminalHost: string;
  terminalPath: string;
  openTerminal: () => void;
  closeTerminal: () => void;
  toggleTerminal: () => void;
  minimizeTerminal: () => void;
  restoreTerminal: () => void;
  setTerminalContext: (user?: string, host?: string, path?: string) => void;

  // Local output buffer for Terminal
  terminalOutput: Array<{ type: "input" | "output" | "error" | "system", text: string, id: string }>;
  appendTerminalOutput: (type: "input" | "output" | "error" | "system", text: string) => void;
  clearTerminalOutput: () => void;
}

export const useClientStore = create<ClientState>((set) => ({
  isTerminalOpen: false,
  isTerminalMinimized: false,
  terminalUser: "guest",
  terminalHost: "lucas-os",
  terminalPath: "~",
  openTerminal: () => set({ isTerminalOpen: true, isTerminalMinimized: false }),
  closeTerminal: () => set({ isTerminalOpen: false, isTerminalMinimized: false }),
  toggleTerminal: () => set((state) => ({ isTerminalOpen: !state.isTerminalOpen, isTerminalMinimized: false })),
  minimizeTerminal: () => set({ isTerminalMinimized: true }),
  restoreTerminal: () => set({ isTerminalMinimized: false }),
  setTerminalContext: (user, host, path) => set((state) => ({
    terminalUser: user !== undefined ? user : state.terminalUser,
    terminalHost: host !== undefined ? host : state.terminalHost,
    terminalPath: path !== undefined ? path : state.terminalPath,
  })),

  terminalOutput: [],
  appendTerminalOutput: (type, text) =>
    set((state) => ({
      terminalOutput: [
        ...state.terminalOutput,
        { type, text, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` },
      ],
    })),
  clearTerminalOutput: () => set({ terminalOutput: [] }),
}));
