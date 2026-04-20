import { create } from 'zustand';

export interface WindowState {
  id: string;
  type: string;
  title: string;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

interface WindowStore {
  windows: WindowState[];
  activeWindowId: string | null;
  openWindow: (type: string, title?: string, id?: string) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
}

let nextZIndex = 10;

export const useWindowStore = create<WindowStore>((set) => ({
  windows: [],
  activeWindowId: null,

  openWindow: (type, title = 'Window', id) => set((state) => {
    const windowId = id || type;
    const exists = state.windows.find(w => w.id === windowId);
    
    if (exists) {
      // If it exists, just focus and restore if minimized
      return {
        windows: state.windows.map(w =>
          w.id === windowId ? { ...w, isMinimized: false, zIndex: ++nextZIndex } : w
        ),
        activeWindowId: windowId,
      };
    }
    
    // Create new window
    const newWindow: WindowState = {
      id: windowId,
      type,
      title,
      isMinimized: false,
      isMaximized: false,
      zIndex: ++nextZIndex,
    };
    
    return {
      windows: [...state.windows, newWindow],
      activeWindowId: windowId,
    };
  }),

  closeWindow: (id) => set((state) => ({
    windows: state.windows.filter((w) => w.id !== id),
    activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
  })),

  minimizeWindow: (id) => set((state) => ({
    windows: state.windows.map((w) =>
      w.id === id ? { ...w, isMinimized: true } : w
    ),
    activeWindowId: state.activeWindowId === id ? null : state.activeWindowId,
  })),

  maximizeWindow: (id) => set((state) => ({
    windows: state.windows.map((w) =>
      w.id === id ? { ...w, isMaximized: true } : w
    ),
  })),
  
  restoreWindow: (id) => set((state) => ({
    windows: state.windows.map((w) =>
      w.id === id ? { ...w, isMaximized: false } : w
    ),
  })),

  focusWindow: (id) => set((state) => {
    const windowToFocus = state.windows.find((w) => w.id === id);
    if (!windowToFocus) return state;

    return {
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, zIndex: ++nextZIndex, isMinimized: false } : w
      ),
      activeWindowId: id,
    };
  }),
}));
