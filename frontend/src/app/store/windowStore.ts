import { create } from "zustand";
import {
  DESKTOP_LAYER,
  DESKTOP_WINDOW_DEFINITIONS,
  type DesktopWindowId,
  type DesktopWindowType,
} from "../../shared/config/desktopWindows";

export interface WindowState {
  id: DesktopWindowId;
  type: DesktopWindowType;
  title: string;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  content?: string;
}

interface WindowStore {
  windows: WindowState[];
  activeWindowId: DesktopWindowId | null;
  openWindow: (
    idOrType: DesktopWindowId | string,
    title?: string,
    content?: string,
    legacyId?: string
  ) => void;
  closeWindow: (id: DesktopWindowId) => void;
  minimizeWindow: (id: DesktopWindowId) => void;
  maximizeWindow: (id: DesktopWindowId) => void;
  toggleMaximizeWindow: (id: DesktopWindowId) => void;
  focusWindow: (id: DesktopWindowId) => void;
  restoreWindow: (id: DesktopWindowId) => void;
  blurAllWindows: () => void;
  resetWindows: () => void;
}

let nextZIndex: number = DESKTOP_LAYER.windowBase;

function isDesktopWindowId(value: unknown): value is DesktopWindowId {
  return typeof value === "string" && value in DESKTOP_WINDOW_DEFINITIONS;
}

function resolveWindowId(
  idOrType: DesktopWindowId | string,
  legacyId?: string
): DesktopWindowId | null {
  if (isDesktopWindowId(idOrType)) return idOrType;
  if (isDesktopWindowId(legacyId)) return legacyId;

  if (idOrType === "browser") return "chrome";
  if (idOrType === "terminal") return "terminal";
  if (idOrType === "terminal2") return "terminal2";
  if (idOrType === "messenger") return "messenger";
  if (idOrType === "email") return "email";

  return null;
}

function getTopVisibleWindowId(
  windows: WindowState[],
  excludedId?: DesktopWindowId
): DesktopWindowId | null {
  return (
    [...windows]
      .filter((windowState) => !windowState.isMinimized && windowState.id !== excludedId)
      .sort((left, right) => right.zIndex - left.zIndex)[0]?.id ?? null
  );
}

function normalizeZOrder(windows: WindowState[]) {
  const orderedWindows = [...windows].sort((left, right) => left.zIndex - right.zIndex);
  const normalizedWindows = orderedWindows.map((windowState, index) => ({
    ...windowState,
    zIndex: DESKTOP_LAYER.windowBase + index * DESKTOP_LAYER.windowStep,
  }));
  const normalizedMap = new Map(normalizedWindows.map((windowState) => [windowState.id, windowState]));

  nextZIndex = normalizedWindows.at(-1)?.zIndex ?? DESKTOP_LAYER.windowBase;

  return windows.map((windowState) => normalizedMap.get(windowState.id) ?? windowState);
}

function prepareWindowsForFront(windows: WindowState[]) {
  const limit = DESKTOP_LAYER.taskbar - DESKTOP_LAYER.windowStep * 2;
  if (nextZIndex + DESKTOP_LAYER.windowStep < limit) {
    return windows;
  }

  return normalizeZOrder(windows);
}

function bringWindowToFront(
  windows: WindowState[],
  id: DesktopWindowId,
  patch: Partial<WindowState> = {}
) {
  const preparedWindows = prepareWindowsForFront(windows);
  nextZIndex += DESKTOP_LAYER.windowStep;

  return preparedWindows.map((windowState) =>
    windowState.id === id
      ? {
          ...windowState,
          ...patch,
          isMinimized: false,
          zIndex: nextZIndex,
        }
      : windowState
  );
}

export const useWindowStore = create<WindowStore>((set) => ({
  windows: [],
  activeWindowId: null,

  openWindow: (idOrType, title, content, legacyId) =>
    set((state) => {
      const resolvedId = resolveWindowId(idOrType, legacyId);
      if (!resolvedId) return state;

      const existingWindow = state.windows.find(
        (windowState) => windowState.id === resolvedId
      );
      if (existingWindow) {
        return {
          windows: bringWindowToFront(state.windows, resolvedId),
          activeWindowId: resolvedId,
        };
      }

      const definition = DESKTOP_WINDOW_DEFINITIONS[resolvedId];
      const preparedWindows = prepareWindowsForFront(state.windows);
      nextZIndex += DESKTOP_LAYER.windowStep;

      const newWindow: WindowState = {
        id: definition.id,
        type: definition.type,
        title: title ?? definition.title,
        content,
        isMinimized: false,
        isMaximized: false,
        zIndex: nextZIndex,
      };

      return {
        windows: [...preparedWindows, newWindow],
        activeWindowId: resolvedId,
      };
    }),

  closeWindow: (id) =>
    set((state) => {
      const windows = state.windows.filter((windowState) => windowState.id !== id);
      const activeWindowId =
        state.activeWindowId === id ? getTopVisibleWindowId(windows) : state.activeWindowId;

      return {
        windows,
        activeWindowId,
      };
    }),

  minimizeWindow: (id) =>
    set((state) => {
      const windows = state.windows.map((windowState) =>
        windowState.id === id ? { ...windowState, isMinimized: true } : windowState
      );
      const activeWindowId =
        state.activeWindowId === id
          ? getTopVisibleWindowId(windows, id)
          : state.activeWindowId;

      return {
        windows,
        activeWindowId,
      };
    }),

  maximizeWindow: (id) =>
    set((state) => {
      const existingWindow = state.windows.find((windowState) => windowState.id === id);
      if (!existingWindow) return state;

      return {
        windows: bringWindowToFront(state.windows, id, { isMaximized: true }),
        activeWindowId: id,
      };
    }),

  toggleMaximizeWindow: (id) =>
    set((state) => {
      const existingWindow = state.windows.find((windowState) => windowState.id === id);
      if (!existingWindow) return state;

      return {
        windows: bringWindowToFront(state.windows, id, {
          isMaximized: !existingWindow.isMaximized,
        }),
        activeWindowId: id,
      };
    }),

  restoreWindow: (id) =>
    set((state) => {
      const existingWindow = state.windows.find((windowState) => windowState.id === id);
      if (!existingWindow) return state;

      return {
        windows: bringWindowToFront(state.windows, id, { isMaximized: false }),
        activeWindowId: id,
      };
    }),

  focusWindow: (id) =>
    set((state) => {
      const existingWindow = state.windows.find((windowState) => windowState.id === id);
      if (!existingWindow) return state;

      return {
        windows: bringWindowToFront(state.windows, id),
        activeWindowId: id,
      };
    }),

  blurAllWindows: () =>
    set(() => ({
      activeWindowId: null,
    })),

  resetWindows: () =>
    set(() => ({
      windows: [],
      activeWindowId: null,
    })),
}));
