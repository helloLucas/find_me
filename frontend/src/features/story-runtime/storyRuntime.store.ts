import { create } from "zustand";
import { useAuthStore } from "../../app/store/authStore";
import { useBrowserContentStore } from "../../app/store/browserContentStore";
import { useClientStore } from "../../app/store/clientStore";
import { useLucasStore } from "../../app/store/lucasStore";
import { useMessengerStore } from "../../app/store/messengerStore";
import { useWindowStore } from "../../app/store/windowStore";
import { normalizeMessengerBundle } from "../messenger/messenger.adapters";
import { storyApi } from "../../shared/api/storyApi";
import type { StoryNode, TransitionRequest } from "../../shared/types/story";
import {
  normalizeStoryOutputBundle,
  objectRecord,
  resolveStoryText,
  shouldOpenBrowserForStoryNode,
  stringValue,
} from "./outputBundle.adapters";
import {
  normalizeStoryNodeResponse,
  normalizeTransitionNodeResponse,
} from "./storyNode.adapters";
import { userApi } from "../../shared/api/userApi";

type StoryRuntimeState = {
  currentNode: StoryNode | null;
  isLoading: boolean;
  error: string | null;
  initializeStory: (chapterCode: string) => Promise<void>;
  setCurrentNode: (node: StoryNode) => void;
  submitStoryAction: (
    actionType: TransitionRequest["actionType"],
    inputValue: string,
    meta?: Record<string, unknown>
  ) => Promise<void>;
  submitStoryClick: (inputValue: string) => Promise<void>;
  submitStoryInspect: (inputValue: string) => Promise<void>;
  submitStoryCommand: (inputValue: string, meta?: Record<string, unknown>) => Promise<void>;
  resetStoryRuntime: () => void;
};

const AUTO_SYSTEM_TRANSITIONS: Record<string, string> = {
  CH1_CONNECT_CORE_SUCCESS: "auto",
  CH1_SSH_CONNECTED: "auto",
};

function resolveChapterCode(chapterCode: string) {
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

async function syncAuthenticatedUserProfile() {
  try {
    const user = await userApi.getMe();
    useAuthStore.getState().setUserProfile({
      nickname: user.nickname,
      role: user.role,
    });
  } catch {
    // Intentionally ignore profile sync failures during story boot.
  }
}

function applyStoryNodeOutputBundle(node: StoryNode) {
  const outputBundle = node.outputBundle;
  if (!outputBundle) return;

  const normalizedOutput = normalizeStoryOutputBundle(outputBundle);

  const browserStore = useBrowserContentStore.getState();
  if (node.code === "CH1_RELAY_CLUE_REVISIT") {
    browserStore.setRelayClueUnlocked(true);
  } else if (node.code === "CH1_LUCAS_DOG_APPEAR") {
    browserStore.setRelayClueUnlocked(false);
  }

  const isBrowserContext =
    shouldOpenBrowserForStoryNode(node, normalizedOutput) ||
    normalizedOutput.scene.mode === "network";

  useLucasStore.getState().setGlitchLevel(normalizedOutput.scene.glitchLevel);
  if (isBrowserContext) {
    browserStore.mergeContent(normalizedOutput.content);
  }

  if (shouldOpenBrowserForStoryNode(node, normalizedOutput)) {
    useWindowStore.getState().openWindow("chrome");
  }

  const conversation = normalizeMessengerBundle(outputBundle, node, {
    playerName: getAuthenticatedPlayerName(),
  });

  if (conversation) {
    useMessengerStore.getState().receiveConversation(conversation);
  }

  const bubbleMessages = normalizedOutput.messages.filter(
    (message) => stringValue(message.channel) === "bubble"
  );

  if (bubbleMessages.length > 0) {
    const effects = objectRecord(normalizedOutput.raw.effects) ?? {};
    useLucasStore.getState().startScene({
      id: normalizedOutput.scene.id ?? node.code,
      mode: normalizedOutput.scene.mode ?? node.nodeType,
      bgm: normalizedOutput.scene.bgm,
      glitchLevel: normalizedOutput.scene.glitchLevel,
      messages: bubbleMessages.map((message) => ({
        speaker: stringValue(message.speaker) ?? "LUCAS",
        channel: "bubble",
        text: resolveStoryText(message.text, {
          playerName: getAuthenticatedPlayerName(),
        }),
        blocking: message.blocking === true,
      })),
      effects: {
        showDogAvatar: effects.showDogAvatar === true,
        breakLayout: effects.breakLayout === true,
      },
    });
  }

  const terminalOutput = normalizedOutput.content.terminalOutput;
  const consoleLogs = normalizedOutput.content.consoleLogs;
  const completionTitle = normalizedOutput.content.completionTitle;
  const completionText = normalizedOutput.content.completionText;
  const terminalLines = [
    ...(typeof completionTitle === "string" ? [completionTitle] : []),
    ...(Array.isArray(terminalOutput) ? terminalOutput.map(String) : []),
    ...(Array.isArray(consoleLogs) ? consoleLogs.map(String) : []),
    ...(Array.isArray(completionText) ? completionText.map(String) : []),
  ];

  if (terminalLines.length > 0) {
    const clientStore = useClientStore.getState();
    terminalLines.forEach((line) => clientStore.appendTerminalOutput("system", line));
  }
}

function getAutoSystemInputValue(node: StoryNode) {
  return AUTO_SYSTEM_TRANSITIONS[node.code];
}

export const useStoryRuntimeStore = create<StoryRuntimeState>((set, get) => ({
  currentNode: null,
  isLoading: false,
  error: null,

  initializeStory: async (chapterCode) => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    useAuthStore.getState().checkAuth();

    // 이전 플레이 세션의 모든 게임 상태를 초기화하여 처음부터 시작
    useBrowserContentStore.getState().resetContent();
    useClientStore.getState().resetClientStore();
    useMessengerStore.getState().resetMessenger();
    useLucasStore.getState().resetLucas();
    useWindowStore.getState().resetWindows();

    await syncAuthenticatedUserProfile();

    try {
      const node = normalizeStoryNodeResponse(
        await storyApi.startStory(resolveChapterCode(chapterCode))
      );
      get().setCurrentNode(node);
    } catch (startError) {
      set({
        error:
          startError instanceof Error
            ? startError.message
            : "스토리 초기화에 실패했습니다.",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrentNode: (node) => {
    set({ currentNode: node, error: null });
    applyStoryNodeOutputBundle(node);

    const autoInputValue = getAutoSystemInputValue(node);
    if (autoInputValue) {
      window.setTimeout(() => {
        const state = get();
        if (state.currentNode?.id === node.id && !state.isLoading) {
          void state.submitStoryAction("system", autoInputValue);
        }
      }, 3000);
    }
  },

  submitStoryAction: async (actionType, inputValue, meta) => {
    const currentNode = get().currentNode;
    if (!currentNode) {
      set({ error: "현재 스토리 노드를 찾을 수 없습니다." });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await storyApi.submitTransition({
        nodeId: currentNode.id,
        actionType,
        inputValue,
        meta,
      });
      const normalizedNextNode = normalizeTransitionNodeResponse(response.nextNode);

      if (response.result === "retry") {
        applyStoryNodeOutputBundle(normalizedNextNode);
      } else {
        get().setCurrentNode(normalizedNextNode);
      }
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "스토리 전이에 실패했습니다.",
      });
    } finally {
      set({ isLoading: false });
    }
  },

  submitStoryClick: async (inputValue) => {
    await get().submitStoryAction("click", inputValue);
  },

  submitStoryInspect: async (inputValue) => {
    await get().submitStoryAction("inspect", inputValue);
  },

  submitStoryCommand: async (inputValue, meta) => {
    await get().submitStoryAction("command", inputValue, meta);
  },

  resetStoryRuntime: () => set({
    currentNode: null,
    isLoading: false,
    error: null,
  }),
}));
