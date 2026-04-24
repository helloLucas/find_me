import { create } from "zustand";
import { useAuthStore } from "../../app/store/authStore";
import { useBrowserContentStore } from "../../app/store/browserContentStore";
import { useClientStore } from "../../app/store/clientStore";
import { useLucasStore } from "../../app/store/lucasStore";
import { useMessengerStore } from "../../app/store/messengerStore";
import { useWindowStore } from "../../app/store/windowStore";
import { storyApi } from "../../shared/api/storyApi";
import { userApi } from "../../shared/api/userApi";
import type { EffectBundle, StoryNode, TransitionRequest } from "../../shared/types/story";
import { normalizeMessengerBundle } from "../messenger/messenger.adapters";
import { audioManager } from "./audioManager";
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

type SetCurrentNodeOptions = {
  transitionSound?: string;
  sourceActionType?: TransitionRequest["actionType"];
};

type StoryRuntimeState = {
  currentNode: StoryNode | null;
  isLoading: boolean;
  error: string | null;
  initializeStory: (chapterCode: string) => Promise<void>;
  setCurrentNode: (node: StoryNode, options?: SetCurrentNodeOptions) => void;
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

const CHAT_NOTIFICATION_SOUND = "notification_v1.mp3";
const LUCAS_BUBBLE_SOUND = "notification_lucas_v1.mp3";
const MOUSE_CLICK_SOUND = "mouse_click_v1.mp3";


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

function extractTransitionPlaySound(effects: EffectBundle[] | undefined) {
  if (!effects || effects.length === 0) return undefined;

  for (const effect of effects) {
    if (effect.type !== "playSound") continue;
    if (typeof effect.payload === "string") return effect.payload;

    const payload = objectRecord(effect.payload);
    if (!payload) continue;
    const resolved = stringValue(payload.sound ?? payload.name ?? payload.value ?? payload.file);
    if (resolved) return resolved;
  }

  return undefined;
}

function resolveNodeEntrySfx(
  normalizedOutput: ReturnType<typeof normalizeStoryOutputBundle>,
  transitionSound: string | undefined,
  sourceActionType?: TransitionRequest["actionType"]
) {
  if (sourceActionType === "click" && transitionSound === MOUSE_CLICK_SOUND) {
    return undefined;
  }
  if (transitionSound) return transitionSound;

  const effects = objectRecord(normalizedOutput.raw.effects) ?? {};
  const entrySound = stringValue(effects.playSound);
  if (sourceActionType === "click" && entrySound === MOUSE_CLICK_SOUND) {
    return undefined;
  }
  return entrySound;
}

function resolveMessageSfx(
  normalizedOutput: ReturnType<typeof normalizeStoryOutputBundle>,
  hasEntrySound: boolean
) {
  if (hasEntrySound) return undefined;
  if (normalizedOutput.scene.preVideo) return undefined;

  const hasLucasBubble = normalizedOutput.messages.some(
    (message) =>
      stringValue(message.channel) === "bubble" &&
      stringValue(message.speaker)?.toUpperCase() === "LUCAS"
  );
  if (hasLucasBubble) return LUCAS_BUBBLE_SOUND;

  const hasChat = normalizedOutput.messages.some(
    (message) => stringValue(message.channel) === "chat"
  );
  if (hasChat) return CHAT_NOTIFICATION_SOUND;

  return undefined;
}

function applyStoryNodeOutputBundle(
  node: StoryNode,
  transitionSound?: string,
  sourceActionType?: TransitionRequest["actionType"]
) {
  const outputBundle = node.outputBundle;
  if (!outputBundle) return;

  const normalizedOutput = normalizeStoryOutputBundle(outputBundle);

  const entrySfx = resolveNodeEntrySfx(normalizedOutput, transitionSound, sourceActionType);
  if (entrySfx) {
    audioManager.playSfx(entrySfx);
  }
  const messageSfx = resolveMessageSfx(normalizedOutput, Boolean(entrySfx));
  if (messageSfx) {
    audioManager.playSfx(messageSfx);
  }

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

function safelyApplyStoryNodeOutputBundle(
  node: StoryNode,
  transitionSound?: string,
  sourceActionType?: TransitionRequest["actionType"]
) {
  try {
    applyStoryNodeOutputBundle(node, transitionSound, sourceActionType);
  } catch (error) {
    // Prevent stale runtime state when output bundle rendering fails.
    console.error("[StoryRuntime] Failed to apply node output bundle", {
      nodeCode: node.code,
      nodeId: node.id,
      error,
    });

    return error instanceof Error
      ? error.message
      : "스토리 출력 반영에 실패했습니다.";
  }

  return null;
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
      try {
        const fallbackNode = normalizeStoryNodeResponse(await storyApi.getCurrentNode());
        get().setCurrentNode(fallbackNode);
      } catch {
        set({
          error:
            startError instanceof Error
              ? startError.message
              : "스토리 초기화에 실패했습니다.",
        });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrentNode: (node, options) => {
    set({ currentNode: node, error: null });
    const applyError = safelyApplyStoryNodeOutputBundle(
      node,
      options?.transitionSound,
      options?.sourceActionType
    );
    if (applyError) {
      set({ error: applyError });
    }

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
      const transitionPlaySound = extractTransitionPlaySound(response.effects);

      if (response.result === "retry") {
        // Keep current progress node and only reflect fail node output on UI.
        const applyError = safelyApplyStoryNodeOutputBundle(
          normalizedNextNode,
          transitionPlaySound,
          actionType
        );
        if (applyError) {
          set({ error: applyError });
        }
      } else {
        get().setCurrentNode(normalizedNextNode, {
          transitionSound: transitionPlaySound,
          sourceActionType: actionType,
        });
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
