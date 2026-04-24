import { create } from "zustand";

interface ClientState {
  terminalUser: string;
  terminalHost: string;
  terminalPath: string;
  setTerminalContext: (user?: string, host?: string, path?: string) => void;

  terminalOutput: Array<{ type: "input" | "output" | "error" | "system"; text: string; id: string }>;
  appendTerminalOutput: (type: "input" | "output" | "error" | "system", text: string) => void;
  clearTerminalOutput: () => void;

  isAccessing: boolean;
  setIsAccessing: (isAccessing: boolean) => void;
}

export const useClientStore = create<ClientState>((set) => ({
  terminalUser: "guest",
  terminalHost: "lucas-os",
  terminalPath: "~",
  setTerminalContext: (user, host, path) =>
    set((state) => ({
      terminalUser: user !== undefined ? user : state.terminalUser,
      terminalHost: host !== undefined ? host : state.terminalHost,
      terminalPath: path !== undefined ? path : state.terminalPath,
    })),

  terminalOutput: [],
  appendTerminalOutput: (type, text) =>
    set((state) => ({
      terminalOutput: [
        ...state.terminalOutput,
        { type, text, id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}` },
      ],
    })),
  clearTerminalOutput: () => set({ terminalOutput: [] }),

  isAccessing: false,
  setIsAccessing: (isAccessing) => set({ isAccessing }),
}));
