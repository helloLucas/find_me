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

export const useToastStore = create<ToastStore>((set) => ({
  toast: null,
  showToast: (message) =>
    set({
      toast: {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        message,
      },
    }),
  hideToast: () => set({ toast: null }),
}));
