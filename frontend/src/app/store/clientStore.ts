import { create } from "zustand";

interface ClientState {
  terminalUser: string;
  terminalHost: string;
  terminalPath: string;
  setTerminalContext: (user?: string, host?: string, path?: string) => void;

  terminalOutput: Array<{ type: "input" | "output" | "error" | "system"; text: string; id: string }>;
  appendTerminalOutput: (type: "input" | "output" | "error" | "system", text: string) => void;
  removeLastTerminalOutput: () => void;
  clearTerminalOutput: () => void;

  isAccessing: boolean;
  setIsAccessing: (isAccessing: boolean) => void;
  
  hasMapAnimationPlayed: boolean;
  setHasMapAnimationPlayed: (played: boolean) => void;
  
  resetClientStore: () => void;
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
  removeLastTerminalOutput: () =>
    set((state) => ({
      terminalOutput: state.terminalOutput.slice(0, -1),
    })),
  clearTerminalOutput: () => set({ terminalOutput: [] }),

  isAccessing: false,
  setIsAccessing: (isAccessing) => set({ isAccessing }),
  
  hasMapAnimationPlayed: false,
  setHasMapAnimationPlayed: (played) => set({ hasMapAnimationPlayed: played }),

  resetClientStore: () => set({
    terminalUser: "guest",
    terminalHost: "lucas-os",
    terminalPath: "~",
    terminalOutput: [],
    isAccessing: false,
    hasMapAnimationPlayed: false,
  }),
}));
