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
}

export const useLucasStore = create<LucasState>((set) => ({
  isVisible: false,
  currentScene: null,
  currentMessageIndex: 0,
  isDialogueActive: false,
  glitchLevel: 0,
  isHintMode: false,
  chatHistory: [],

  startScene: (scene) => set({
    currentScene: scene,
    currentMessageIndex: 0,
    isDialogueActive: true,
    isVisible: scene.effects?.showDogAvatar ?? true,
    glitchLevel: scene.glitchLevel ?? 0,
  }),

  nextMessage: () => set((state) => {
    if (!state.currentScene) return state;
    
    const nextIndex = state.currentMessageIndex + 1;
    if (nextIndex < state.currentScene.messages.length) {
      return { currentMessageIndex: nextIndex };
    } else {
      // Scene finished
      return { 
        isDialogueActive: false,
        // Keep Lucas visible if it's not a dismissive scene
        // isVisible: state.isVisible 
      };
    }
  }),

  endDialogue: () => set({ 
    isDialogueActive: false, 
    currentScene: null, 
    currentMessageIndex: 0 
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
}));
