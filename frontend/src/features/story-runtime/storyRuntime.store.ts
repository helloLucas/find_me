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
import { normalizeStoryNodeResponse } from "./storyNode.adapters";
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
};

const AUTO_SYSTEM_TRANSITIONS: Record<string, string> = {
  CH1_DARK_ARTICLE_OPEN: "auto",
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
    // TODO: collect this failure in production logging pipeline.
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

  // TODO: wire scene.bgm when audio runtime is introduced.

  useLucasStore.getState().setGlitchLevel(normalizedOutput.scene.glitchLevel);
  if (isBrowserContext) {
    browserStore.mergeContent(normalizedOutput.content);
  }

  if (shouldOpenBrowserForStoryNode(node, normalizedOutput)) {
    useWindowStore.getState().openWindow("browser", "Web Browser", "chrome");
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
  const consoleLogs = normalizedOutput.content.consoleLogs;   // FAIL/system 노드에서 사용
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
    set({ isLoading: true, error: null });
    useAuthStore.getState().checkAuth();
    useBrowserContentStore.getState().resetContent();
    await syncAuthenticatedUserProfile();

    try {
      const node = normalizeStoryNodeResponse(await storyApi.startStory(resolveChapterCode(chapterCode)));
      get().setCurrentNode(node);
    } catch (startError) {
      try {
        const fallbackNode = normalizeStoryNodeResponse(await storyApi.getCurrentNode());
        get().setCurrentNode(fallbackNode);
      } catch {
        set({
          error: startError instanceof Error ? startError.message : "스토리 초기화에 실패했습니다.",
        });
      }
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

      if (response.result === "retry") {
        // FAIL 노드 응답: currentNode 진행상태는 유지하고 FAIL 노드의 outputBundle만 UI에 반영한다.
        // 이렇게 해야 다음 입력도 여전히 현재 노드(currentNode) 기준으로 전이 판정된다.
        applyStoryNodeOutputBundle(response.nextNode);
      } else {
        get().setCurrentNode(response.nextNode);
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "스토리 전이에 실패했습니다.",
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
}));
