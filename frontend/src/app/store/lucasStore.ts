import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface LucasMessage {
  speaker: string;
  channel: 'bubble' | 'system' | string;
  text: string;
  blocking?: boolean;
}

export interface LucasScene {
  id: string;
  mode: string;
  bgm?: string;
  glitchLevel?: number;
  messages: LucasMessage[];
  effects?: {
    showDogAvatar?: boolean;
    breakLayout?: boolean;
  };
}

interface ChatMessage {
  id: string;
  speaker: 'LUCAS' | 'PLAYER';
  text: string;
  timestamp: number;
}

interface LucasState {
  isVisible: boolean;
  currentScene: LucasScene | null;
  currentMessageIndex: number;
  isDialogueActive: boolean;
  glitchLevel: number;
  isHintMode: boolean;
  chatHistory: ChatMessage[];
  chatScopeKey: string;
  chatHistoryByScope: Record<string, ChatMessage[]>;

  // Actions
  startScene: (scene: LucasScene) => void;
  nextMessage: () => void;
  endDialogue: () => void;
  setGlitchLevel: (level: number) => void;
  toggleHintMode: (active: boolean) => void;
  addChatMessage: (speaker: 'LUCAS' | 'PLAYER', text: string) => void;
  clearChatHistory: () => void;
  setChatScope: (scopeKey: string, reset?: boolean) => void;
  resetLucas: () => void;
}

const CHAT_HISTORY_MAX = 120;

export const useLucasStore = create<LucasState>()(
    (set, get) => ({
  isVisible: false,
  currentScene: null,
  currentMessageIndex: 0,
  isDialogueActive: false,
  glitchLevel: 0,
  isHintMode: false,
  chatHistory: [],
  chatScopeKey: 'global',
  chatHistoryByScope: {},

  startScene: (scene) => set((state) => {
    // 씬이 시작되면, 현재 씬의 첫 번째 메시지를 기록에 추가합니다
    const firstMsg = scene.messages[0];
    const newChatHistory = [...state.chatHistory];

    if (firstMsg) {
      newChatHistory.push({
        id: Date.now().toString() + '-0',
        speaker: firstMsg.speaker as 'LUCAS' | 'PLAYER',
        text: firstMsg.text,
        timestamp: Date.now()
      });
    }

    const scopedHistory = newChatHistory.slice(-CHAT_HISTORY_MAX);

    return {
      currentScene: scene,
      currentMessageIndex: 0,
      isDialogueActive: true,
      isVisible: true,
      glitchLevel: scene.glitchLevel ?? 0,
      chatHistory: scopedHistory,
      chatHistoryByScope: {
        ...state.chatHistoryByScope,
        [state.chatScopeKey]: scopedHistory,
      },
    };
  }),

  nextMessage: () => set((state) => {
    if (!state.currentScene) return state;

    const nextIndex = state.currentMessageIndex + 1;
    if (nextIndex < state.currentScene.messages.length) {
      const nextMsg = state.currentScene.messages[nextIndex];
      return {
        currentMessageIndex: nextIndex,
        chatHistory: [
          ...state.chatHistory,
          {
            id: Date.now().toString() + '-' + nextIndex,
            speaker: nextMsg.speaker as 'LUCAS' | 'PLAYER',
            text: nextMsg.text,
            timestamp: Date.now()
          }
        ].slice(-CHAT_HISTORY_MAX),
        chatHistoryByScope: {
          ...state.chatHistoryByScope,
          [state.chatScopeKey]: [
            ...state.chatHistory,
            {
              id: Date.now().toString() + '-' + nextIndex,
              speaker: nextMsg.speaker as 'LUCAS' | 'PLAYER',
              text: nextMsg.text,
              timestamp: Date.now(),
            },
          ].slice(-CHAT_HISTORY_MAX),
        },
      };
    } else {
      // Scene finished - RESET GLITCH
      return {
        isDialogueActive: false,
        glitchLevel: 0
      };
    }
  }),

  endDialogue: () => set({
    isDialogueActive: false,
    currentScene: null,
    currentMessageIndex: 0,
    glitchLevel: 0
  }),

  setGlitchLevel: (level) => set({ glitchLevel: level }),

  toggleHintMode: (active) => set((state) => ({
    isHintMode: active,
    isVisible: active || state.isVisible
  })),

  addChatMessage: (speaker, text) => set((state) => ({
    chatHistory: [
      ...state.chatHistory,
      { id: Date.now().toString(), speaker, text, timestamp: Date.now() },
    ].slice(-CHAT_HISTORY_MAX),
    chatHistoryByScope: {
      ...state.chatHistoryByScope,
      [state.chatScopeKey]: [
        ...state.chatHistory,
        { id: Date.now().toString(), speaker, text, timestamp: Date.now() },
      ].slice(-CHAT_HISTORY_MAX),
    },
  })),

  clearChatHistory: () => set((state) => ({
    chatHistory: [],
    chatHistoryByScope: {
      ...state.chatHistoryByScope,
      [state.chatScopeKey]: [],
    },
  })),

  setChatScope: (scopeKey, reset = false) =>
    set((state) => {
      const nextScope = scopeKey?.trim() || 'global';
      const scopeHistory = reset ? [] : (state.chatHistoryByScope[nextScope] ?? []);
      return {
        chatScopeKey: nextScope,
        chatHistory: scopeHistory,
        chatHistoryByScope: {
          ...state.chatHistoryByScope,
          [nextScope]: scopeHistory,
        },
      };
    }),

  resetLucas: () => set({
    isVisible: false,
    currentScene: null,
    currentMessageIndex: 0,
    isDialogueActive: false,
    glitchLevel: 0,
    isHintMode: false,
    chatHistory: get().chatHistory,
  }),
    })
);
