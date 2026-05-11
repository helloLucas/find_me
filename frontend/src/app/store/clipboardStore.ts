import { create } from "zustand";

interface ClipboardState {
  text: string;
  setClipboardText: (text: string) => void;
  clearClipboardText: () => void;
}

export const useClipboardStore = create<ClipboardState>((set) => ({
  text: "",
  setClipboardText: (text) => set({ text }),
  clearClipboardText: () => set({ text: "" }),
}));
export default useClipboardStore;
