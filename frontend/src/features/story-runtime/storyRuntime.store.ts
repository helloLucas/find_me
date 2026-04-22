import { create } from "zustand";
import { useAuthStore } from "../../app/store/authStore";
import { useLucasStore } from "../../app/store/lucasStore";
import { useMessengerStore } from "../../app/store/messengerStore";
import { useWindowStore } from "../../app/store/windowStore";
import { normalizeMessengerBundle } from "../messenger/messenger.adapters";
import { storyApi } from "../../shared/api/storyApi";
import type { StoryNode } from "../../shared/types/story";
import {
  normalizeStoryOutputBundle,
  shouldOpenBrowserForStoryNode,
} from "./outputBundle.adapters";
import { normalizeStoryNodeResponse } from "./storyNode.adapters";


type StoryRuntimeState = {
  currentNode: StoryNode | null;
  isLoading: boolean;
  error: string | null;
  initializeStory: (chapterCode: string) => Promise<void>;
  setCurrentNode: (node: StoryNode) => void;
  submitStoryClick: (inputValue: string) => Promise<void>;
};

function resolveChapterCode(chapterCode: string) {
  // TODO: Replace this temporary route-code mapping when chapterHash decoding is finalized.
  if (chapterCode === "ch1" || chapterCode === "stage1" || chapterCode === "week1") {
    return "week01";
  }

  return chapterCode || "week01";
}

function getAuthenticatedPlayerName() {
  const nickname = useAuthStore.getState().nickname;
  if (!nickname || nickname === "ANONYMOUS" || nickname === "UNKNOWN_AGENT") return undefined;
  return nickname;
}

function applyStoryNodeOutputBundle(node: StoryNode) {
  const outputBundle = node.outputBundle;
  if (!outputBundle) return;

  const normalizedOutput = normalizeStoryOutputBundle(outputBundle);
  
  // BGM is handled in PlayPage to support deferring until preVideo finishes.
  useLucasStore.getState().setGlitchLevel(normalizedOutput.scene.glitchLevel);

  if (shouldOpenBrowserForStoryNode(node, normalizedOutput)) {
    useWindowStore.getState().openWindow("browser", "Web Browser", "chrome");
  }

  const conversation = normalizeMessengerBundle(outputBundle, node, {
    playerName: getAuthenticatedPlayerName(),
  });

  if (conversation) {
    useMessengerStore.getState().receiveConversation(conversation);
  }
}

export const useStoryRuntimeStore = create<StoryRuntimeState>((set, get) => ({
  currentNode: null,
  isLoading: false,
  error: null,

  initializeStory: async (chapterCode) => {
    set({ isLoading: true, error: null });
    useAuthStore.getState().checkAuth();

    try {
      // TODO: Switch between "new start" and "continue" when the play-entry UX is finalized.
      const node = normalizeStoryNodeResponse(await storyApi.startStory(resolveChapterCode(chapterCode)));
      get().setCurrentNode(node);
    } catch (startError) {
      try {
        const fallbackNode = normalizeStoryNodeResponse(await storyApi.getCurrentNode());
        get().setCurrentNode(fallbackNode);
      } catch {
        set({
          error: startError instanceof Error ? startError.message : "Failed to initialize story.",
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrentNode: (node) => {
    set({ currentNode: node, error: null });
    applyStoryNodeOutputBundle(node);
  },

  submitStoryClick: async (inputValue) => {
    const currentNode = get().currentNode;
    if (!currentNode) {
      set({ error: "Current story node is missing." });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await storyApi.submitTransition({
        nodeId: currentNode.id,
        actionType: "click",
        inputValue,
      });

      get().setCurrentNode(response.nextNode);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to submit story transition.",
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));
