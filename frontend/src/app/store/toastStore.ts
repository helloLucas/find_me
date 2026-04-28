import { create } from 'zustand';

type ToastMessage = {
  id: string;
  message: string;
};

interface ToastStore {
  toast: ToastMessage | null;
  showToast: (message: string) => void;
  hideToast: () => void;
}

let fallbackToastId = 0;

function createToastId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  fallbackToastId += 1;
  return `toast-${Date.now()}-${fallbackToastId}`;
}

export const useToastStore = create<ToastStore>((set) => ({
  toast: null,
  showToast: (message) =>
    set({
      toast: {
        id: createToastId(),
        message,
      },
    }),
  hideToast: () => set({ toast: null }),
}));
