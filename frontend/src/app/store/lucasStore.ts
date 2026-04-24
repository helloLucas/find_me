import { create } from 'zustand';

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

  // Actions
  startScene: (scene: LucasScene) => void;
  nextMessage: () => void;
  endDialogue: () => void;
  setGlitchLevel: (level: number) => void;
  toggleHintMode: (active: boolean) => void;
  addChatMessage: (speaker: 'LUCAS' | 'PLAYER', text: string) => void;
  resetLucas: () => void;
}

export const useLucasStore = create<LucasState>((set) => ({
  isVisible: false,
  currentScene: null,
  currentMessageIndex: 0,
  isDialogueActive: false,
  glitchLevel: 0,
  isHintMode: false,
  chatHistory: [],

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

    return {
      currentScene: scene,
      currentMessageIndex: 0,
      isDialogueActive: true,
      isVisible: true,
      glitchLevel: scene.glitchLevel ?? 0,
      chatHistory: newChatHistory,
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
        ]
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
      { id: Date.now().toString(), speaker, text, timestamp: Date.now() }
    ]
  })),

  resetLucas: () => set({
    isVisible: false,
    currentScene: null,
    currentMessageIndex: 0,
    isDialogueActive: false,
    glitchLevel: 0,
    isHintMode: false,
    chatHistory: [],
  }),
}));
