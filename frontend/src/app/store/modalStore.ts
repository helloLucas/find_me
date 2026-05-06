import { create } from 'zustand';

export type ModalType = 'alert' | 'confirm';

interface ModalOptions {
  title?: string;
  message: string;
  type?: ModalType;
  onConfirm?: () => boolean | void;
  onCancel?: () => void;
}

interface ModalStore {
  isOpen: boolean;
  title: string;
  message: string;
  type: ModalType;
  onConfirm: (() => boolean | void) | null;
  onCancel: (() => void) | null;

  /**
   * 모달을 엽니다.
   */
  openModal: (options: ModalOptions) => void;
  
  /**
   * 모달을 닫습니다.
   */
  closeModal: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  isOpen: false,
  title: 'SYSTEM_PROMPT',
  message: '',
  type: 'alert',
  onConfirm: null,
  onCancel: null,

  openModal: (options) => set({
    isOpen: true,
    title: options.title || 'SYSTEM_PROMPT',
    message: options.message,
    type: options.type || 'alert',
    onConfirm: options.onConfirm || null,
    onCancel: options.onCancel || null,
  }),

  closeModal: () => set({
    isOpen: false,
    onConfirm: null,
    onCancel: null,
  }),
}));
