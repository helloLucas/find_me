import { create } from 'zustand';

type ConnectionStatus = 'online' | 'offline';

interface ConnectionStatusStore {
  status: ConnectionStatus;
  lastFailedAt: number | null;
  isRetrying: boolean;
  markOffline: () => void;
  markOnline: () => void;
  setRetrying: (isRetrying: boolean) => void;
}

export const useConnectionStatusStore = create<ConnectionStatusStore>((set) => ({
  status: 'online',
  lastFailedAt: null,
  isRetrying: false,

  markOffline: () => set({
    status: 'offline',
    lastFailedAt: Date.now(),
  }),

  markOnline: () => set({
    status: 'online',
    isRetrying: false,
  }),

  setRetrying: (isRetrying) => set({ isRetrying }),
}));
