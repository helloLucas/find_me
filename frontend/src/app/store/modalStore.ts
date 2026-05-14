import { create } from 'zustand';

export type ModalType = 'alert' | 'confirm';

interface ModalOptions {
  title?: string;
  message: string;
  type?: ModalType;
  onConfirm?: () => boolean | void | Promise<boolean | void>;
  onCancel?: () => void;
}

interface ModalStore {
  isOpen: boolean;
  title: string;
  message: string;
  type: ModalType;
  onConfirm: (() => boolean | void | Promise<boolean | void>) | null;
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

const CONNECTION_FAILED_MODAL_COOLDOWN_MS = 2000;
let lastConnectionFailedModalOpenedAt = 0;

type ConnectionFailedModalOptions = {
  force?: boolean;
};

export function openConnectionFailedModal(options: ConnectionFailedModalOptions = {}) {
  const state = useModalStore.getState();
  const now = Date.now();

  if (state.isOpen && state.title === 'CONNECTION_FAILED') return;
  if (!options.force && now - lastConnectionFailedModalOpenedAt < CONNECTION_FAILED_MODAL_COOLDOWN_MS) return;

  lastConnectionFailedModalOpenedAt = now;
  useModalStore.getState().openModal({
    title: 'CONNECTION_FAILED',
    message: '서버와 연결할 수 없습니다. \n네트워크 상태를 확인해 주세요.',
    type: 'alert',
  });
}
