import i18n from "../../i18n";
import { create } from "zustand";
import { useAuthStore } from "../../app/store/authStore";
import { useBrowserContentStore } from "../../app/store/browserContentStore";
import { useCallOverlayStore } from "../../app/store/callOverlayStore";
import { useClientStore } from "../../app/store/clientStore";
import { useToastStore } from "../../app/store/toastStore";
import { useLucasStore } from "../../app/store/lucasStore";
import { useMessengerStore } from "../../app/store/messengerStore";
import { useWindowStore } from "../../app/store/windowStore";
import { useNotepadStore } from "../../app/store/notepadStore";
import { storyApi } from "../../shared/api/storyApi";
import { userApi } from "../../shared/api/userApi";
import type {
  EffectBundle,
  StoryNode,
  TerminalResult,
  TransitionRequest,
} from "../../shared/types/story";
import {
  isSshCommand,
  shouldShowUnavailableCommandToast,
  SSH_USAGE_TEXT,
  UNAVAILABLE_COMMAND_TOAST_MESSAGE,
} from "../command-input/terminalCommandFeedback";
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
  terminalLinesOverride?: string[];
  source?: "terminal" | "browser";
};

type ApplyStoryNodeOutputOptions = {
  transitionSound?: string;
  sourceActionType?: TransitionRequest["actionType"];
  terminalLinesOverride?: string[];
  source?: "terminal" | "browser"; // 명령어가 어디서 시작되었는지 구분
};

type TerminalPromptContext = {
  sourceLine: string;
  user: string;
  host: string;
  path: string;
};

type StoryRuntimeState = {
  currentNode: StoryNode | null;
  isLoading: boolean;
  error: string | null;
  initializationId: number;
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
  CH2_WORLD_MAP_VIEW: "auto",
  CH2_RECOVERED_DOCUMENT: "auto",
  CH4_ROLLBACK_SEQUENCE: "auto",
  CH4_REBOOT_SEQUENCE: "auto",
  CH4_CLEAN_ROLLBACK_SEQUENCE: "auto",
};
const MAPLE_STORY_TERMINAL_SIGNAL = "terminal://maple-story";

const CHAT_NOTIFICATION_SOUND = "notification_v1.mp3";
const DEFAULT_TRANSITION_SOUND = "notification_v1.mp3";
const LUCAS_BUBBLE_SOUND = "notification_lucas_v1.mp3";
const MOUSE_CLICK_SOUND = "mouse_click_v1.mp3";
const RING_TONE_SOUND = "chapter3_ringtone.mp3";
const CLEAR_TERMINAL_SIGNAL = "__CLEAR_TERMINAL__";


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
  hasEntrySound: boolean,
  sourceActionType?: TransitionRequest["actionType"]
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

  if (sourceActionType) return DEFAULT_TRANSITION_SOUND;

  return undefined;
}

function getAutoAdvanceDelayMs(node: StoryNode) {
  const meta = objectRecord(node.promptMeta) ?? {};
  const rawDelay = meta.autoAdvanceMs;
  if (typeof rawDelay !== "number" || !Number.isFinite(rawDelay)) return undefined;
  return Math.max(0, rawDelay);
}

function parseTerminalPromptContext(line: string): TerminalPromptContext | undefined {
  const match = line.match(/^([^@\s]+)@([^:\s]+):([^\r\n$#]+)[$#]\s*$/);
  if (!match) return undefined;

  return {
    sourceLine: line,
    user: match[1],
    host: match[2],
    path: match[3],
  };
}

function getTerminalProfile(node: StoryNode | null | undefined) {
  const promptMeta = objectRecord(node?.promptMeta) ?? {};
  return stringValue(promptMeta.terminalProfile);
}

function getPromptPlaceholderContext(node: StoryNode) {
  const promptMeta = objectRecord(node.promptMeta) ?? {};
  const placeholder = stringValue(promptMeta.placeholder);
  return placeholder ? parseTerminalPromptContext(placeholder) : undefined;
}

function isTerminalRuntimeNode(
  node: StoryNode,
  normalizedOutput: ReturnType<typeof normalizeStoryOutputBundle>
) {
  return (
    normalizedOutput.scene.mode === "terminal" ||
    Boolean(getTerminalProfile(node)) ||
    node.isTerminal
  );
}

function shouldOpenCallOverlay(normalizedOutput: ReturnType<typeof normalizeStoryOutputBundle>) {
  return (
    normalizedOutput.scene.mode === "call" ||
    normalizedOutput.uiMarkers.showCallOverlay === true
  );
}

function getCallOverlayButtons(node: StoryNode) {
  if (node.promptType !== "click") return [];

  const promptMeta = objectRecord(node.promptMeta) ?? {};
  const buttons = Array.isArray(promptMeta.buttons) ? promptMeta.buttons : [];

  return buttons
    .map((button) => {
      const buttonRecord = objectRecord(button);
      if (!buttonRecord) return undefined;

      const value = stringValue(buttonRecord.value);
      if (!value) return undefined;

      return {
        label: stringValue(buttonRecord.label) ?? value,
        value,
      };
    })
    .filter((button): button is { label: string; value: string } => Boolean(button));
}

function applyCallOverlayOutput(
  node: StoryNode,
  normalizedOutput: ReturnType<typeof normalizeStoryOutputBundle>
) {
  if (!shouldOpenCallOverlay(normalizedOutput)) {
    useCallOverlayStore.getState().closeCallOverlay();
    return;
  }

  const playerName = getAuthenticatedPlayerName();
  const callMessages = normalizedOutput.messages.filter((message) => {
    const channel = stringValue(message.channel);
    return channel === "call" || channel === "terminal_notice";
  });
  const callNotification = normalizedOutput.notifications.find(
    (notification) => stringValue(notification.type) === "call"
  );

  useCallOverlayStore.getState().openCallOverlay({
    nodeCode: node.code,
    title: stringValue(callNotification?.title) ?? i18n.t("story.incomingCall"),
    status:
      stringValue(normalizedOutput.uiMarkers.callStatus) ??
      stringValue(callNotification?.body),
    messages: callMessages.map((message) => ({
      speaker: stringValue(message.speaker) ?? i18n.t("story.unknownSpeaker"),
      channel: stringValue(message.channel) ?? "call",
      text: resolveStoryText(message.text, { playerName }),
    })),
    buttons: getCallOverlayButtons(node),
  });
}

function applyStoryNodeOutputBundle(
  node: StoryNode,
  options: ApplyStoryNodeOutputOptions = {}
) {
  const outputBundle = node.outputBundle;
  if (!outputBundle) {
    useCallOverlayStore.getState().closeCallOverlay();
    return;
  }

  const normalizedOutput = normalizeStoryOutputBundle(outputBundle);
  applyCallOverlayOutput(node, normalizedOutput);

  const entrySfx = resolveNodeEntrySfx(
    normalizedOutput,
    options.transitionSound,
    options.sourceActionType
  );
  if (entrySfx) {
    audioManager.playSfx(entrySfx);
  }
  const messageSfx = resolveMessageSfx(
    normalizedOutput,
    Boolean(entrySfx),
    options.sourceActionType
  );
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

  const content = objectRecord(normalizedOutput.content) ?? {};
  const documentId = stringValue(content.documentId);

  if (shouldOpenBrowserForStoryNode(node, normalizedOutput)) {
    useWindowStore.getState().openWindow("browser", i18n.t("story.webBrowser"), undefined, "chrome");
  }

  const terminalProfile = getTerminalProfile(node);
  const isTerminalContext = isTerminalRuntimeNode(node, normalizedOutput);

  if (isTerminalContext) {
    useWindowStore.getState().openWindow("terminal", i18n.t("story.terminal"), undefined, "terminal");
  }

  if (node.code === "CH2_RECOVERED_DOCUMENT") {
    useWindowStore.getState().openWindow(
      "document_viewer",
      "FRAGMENT_RECOVERED_082.PDF",
      documentId
    );
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
  const terminalOutputLines = Array.isArray(terminalOutput) ? terminalOutput.map(String) : [];
  const connectedPromptContext =
    isTerminalContext || node.code === "CH1_SSH_CONNECTED"
      ? terminalOutputLines.map(parseTerminalPromptContext).find(Boolean)
      : undefined;
  const visibleTerminalOutputLines = connectedPromptContext
    ? terminalOutputLines.filter((line) => line !== connectedPromptContext.sourceLine)
    : terminalOutputLines;
  const terminalLines = options.terminalLinesOverride ?? [
    ...(typeof completionTitle === "string" ? [completionTitle] : []),
    ...visibleTerminalOutputLines,
    ...(Array.isArray(consoleLogs) ? consoleLogs.map(String) : []),
    ...(Array.isArray(completionText) ? completionText.map(String) : []),
  ];

  const clientStore = useClientStore.getState();
  if (connectedPromptContext) {
    clientStore.setTerminalContext(
      connectedPromptContext.user,
      connectedPromptContext.host,
      connectedPromptContext.path
    );
  } else if (terminalProfile) {
    const placeholderContext = getPromptPlaceholderContext(node);
    if (placeholderContext) {
      clientStore.setTerminalContext(
        placeholderContext.user,
        placeholderContext.host,
        placeholderContext.path
      );
    } else if (
      terminalProfile === "chapter4" &&
      clientStore.terminalUser === "guest" &&
      clientStore.terminalHost === "lucas-os"
    ) {
      clientStore.setTerminalContext("guest", "lucas-server", "~");
    }
  }

  // 브라우저에서 실행된 액션이라면 터미널 출력을 건너뜀
  if (options.source === "browser") {
    return;
  }

  if (terminalLines.length > 0) {
    const existingSystemLines = new Set(
      clientStore.terminalOutput
        .filter((line) => line.type === "system")
        .map((line) => line.text)
    );
    const filteredTerminalLines = terminalLines.filter((line) => {
      if (line === "__REMOVE_LAST_INPUT__") {
        clientStore.removeLastTerminalOutput();
        return false;
      }
      if (handleTerminalControlLine(String(line), clientStore)) {
        return false;
      }
      if (!line.startsWith("terminal://")) return true;
      return !existingSystemLines.has(line);
    });

    filteredTerminalLines.forEach((line) => clientStore.appendTerminalOutput("system", line));
  }
}

function safelyApplyStoryNodeOutputBundle(
  node: StoryNode,
  options: ApplyStoryNodeOutputOptions = {}
) {
  try {
    applyStoryNodeOutputBundle(node, options);
  } catch (error) {
    // Prevent stale runtime state when output bundle rendering fails.
    console.error("[StoryRuntime] Failed to apply node output bundle", {
      nodeCode: node.code,
      nodeId: node.id,
      error,
    });

    return error instanceof Error
      ? error.message
      : i18n.t("story.error.applyOutputFailed");
  }

  return null;
}

function getAutoSystemInputValue(node: StoryNode) {
  return AUTO_SYSTEM_TRANSITIONS[node.code];
}

function getCommandNotFoundLine(inputValue: string | undefined) {
  const commandName = inputValue?.trim().split(/\s+/)[0];
  return i18n.t("story.error.commandNotFound", { command: commandName || "command" });
}

function showUnavailableCommandToast() {
  useToastStore.getState().showToast(UNAVAILABLE_COMMAND_TOAST_MESSAGE);
}

function getRetryTerminalLinesOverride(
  actionType: TransitionRequest["actionType"],
  inputValue: string | undefined,
  fromNodeCode: string | undefined,
  nodeCode: string
) {
  if (actionType !== "command") {
    return undefined;
  }

  const normalizedInput = inputValue?.trim().replace(/\s+/g, " ").toLowerCase();

  if (
    fromNodeCode === "CH1_SSH_AUTH_PROMPT" &&
    normalizedInput === "no"
  ) {
    return [];
  }

  if (shouldShowUnavailableCommandToast(actionType, inputValue, fromNodeCode, nodeCode)) {
    return [];
  }

  if (nodeCode === "CH1_FAIL_UNRELATED" && isSshCommand(inputValue)) {
    return [SSH_USAGE_TEXT];
  }

  if (nodeCode !== "CH1_FAIL_UNRELATED") {
    return undefined;
  }

  return [getCommandNotFoundLine(inputValue)];
}

function hasClickTarget(node: StoryNode, target: string) {
  if (node.promptType !== "click") return false;

  const meta = objectRecord(node.promptMeta) ?? {};
  const clickTargets = Array.isArray(meta.clickTargets) ? meta.clickTargets.map(String) : [];

  return clickTargets.includes(target);
}

function shouldAutoDismissRetryNode(
  actionType: TransitionRequest["actionType"],
  node: StoryNode
) {
  return actionType === "command" && node.code.includes("_FAIL_") && hasClickTarget(node, "dismiss");
}

function isTransitionNotAllowedError(error: unknown) {
  if (error instanceof Error) {
    return error.message.includes("409") || error.message.includes("A1001");
  }

  return false;
}

function getAutoDismissTerminalLinesOverride(node: StoryNode) {
  // Avoid repeatedly printing terminal://lucas-relay on every fail -> dismiss recovery.
  if (node.code === "CH1_TERMINAL_SSH_READY") {
    return [] as string[];
  }

  return undefined;
}

function toTerminalDisplayPath(cwd: string | undefined) {
  if (!cwd) return undefined;
  if (cwd === "/home/guest") return "~";
  if (cwd.startsWith("/home/guest/")) return `~${cwd.slice("/home/guest".length)}`;
  return cwd;
}

function getActionSource(meta: Record<string, unknown> | undefined): "terminal" | "browser" | undefined {
  return meta?.source === "terminal" || meta?.source === "browser" ? meta.source : undefined;
}

function handleTerminalControlLine(line: string, clientStore = useClientStore.getState()) {
  if (line === CLEAR_TERMINAL_SIGNAL) {
    clientStore.clearTerminalOutput();
    return true;
  }

  if (line === MAPLE_STORY_TERMINAL_SIGNAL) {
    useWindowStore.getState().openWindow("terminal2");
    return true;
  }

  if (line === "terminal://lucas-route") {
    const windowStore = useWindowStore.getState();
    windowStore.openWindow("browser");
    windowStore.maximizeWindow("chrome");
    useBrowserContentStore.getState().triggerLucasRouteTabClick({ storyLinked: true });
    return true;
  }

  if (line === "terminal://lucas-survival") {
    useWindowStore.getState().openWindow("browser");
    useBrowserContentStore.getState().triggerLucasSurvivalTabClick();
    return true;
  }

  return false;
}

function applyTerminalResult(terminalResult: TerminalResult | undefined, source?: "terminal" | "browser") {
  if (!terminalResult) return;

  // 브라우저에서 보낸 명령어의 결과물(stdout/stderr)은 터미널에 출력하지 않음
  if (source === "browser") return;

  const clientStore = useClientStore.getState();
  const promptContext =
    typeof terminalResult.prompt === "string"
      ? parseTerminalPromptContext(terminalResult.prompt)
      : undefined;

  if (promptContext) {
    clientStore.setTerminalContext(promptContext.user, promptContext.host, promptContext.path);
  } else {
    clientStore.setTerminalContext(undefined, undefined, toTerminalDisplayPath(terminalResult.cwd));
  }

  for (const line of terminalResult.stdout ?? []) {
    if (handleTerminalControlLine(String(line), clientStore)) {
      continue;
    }

    clientStore.appendTerminalOutput("output", String(line));
  }

  for (const line of terminalResult.stderr ?? []) {
    clientStore.appendTerminalOutput("error", String(line));
  }
}

export const useStoryRuntimeStore = create<StoryRuntimeState>((set, get) => ({
  currentNode: null,
  isLoading: false,
  error: null,
  initializationId: 0,
  initializeStory: async (chapterCode) => {
    // 이전 플레이 세션의 모든 게임 상태를 초기화하여 처음부터 시작
    get().resetStoryRuntime();

    // 중복 호출 및 레이스 컨디션 방지를 위한 세션 ID 증가
    const currentId = get().initializationId + 1;
    set({
      initializationId: currentId,
      isLoading: true,
      error: null
    });

    useAuthStore.getState().checkAuth();
    await syncAuthenticatedUserProfile();

    try {
      const nodeResponse = await storyApi.startStory(chapterCode);
      const node = normalizeStoryNodeResponse(nodeResponse.data);

      // 세션이 유효한지 확인
      if (get().initializationId !== currentId) return;

      get().setCurrentNode(node);

      // Chapter 3 도입 시 벨소리 재생 (Node 1: CH3_FRIEND_CALL)
      if (node.code === "CH3_FRIEND_CALL") {
        const callStore = useCallOverlayStore.getState();
        callStore.setRinging(true);
        audioManager.playSfx(RING_TONE_SOUND);
        // 벨소리를 충분히 들려주기 위해 6초 대기 후 콘텐츠 표시
        await new Promise((resolve) => setTimeout(resolve, 6000));

        // 대기 후 세션이 여전히 유효한지 재확인
        if (get().initializationId !== currentId) return;

        callStore.setRinging(false);
      }
    } catch (startError) {
      if (get().initializationId !== currentId) return;

      try {
        const fallbackNode = normalizeStoryNodeResponse(await storyApi.getCurrentNode());
        if (get().initializationId !== currentId) return;

        get().setCurrentNode(fallbackNode);

        // Resume 시에도 Chapter 3 첫 노드라면 벨소리 재생
        if (fallbackNode.code === "CH3_FRIEND_CALL") {
          const callStore = useCallOverlayStore.getState();
          callStore.setRinging(true);
          audioManager.playSfx(RING_TONE_SOUND);
          await new Promise((resolve) => setTimeout(resolve, 6000));

          if (get().initializationId !== currentId) return;
          callStore.setRinging(false);
        }
      } catch {
        if (get().initializationId !== currentId) return;
        set({
          error:
            startError instanceof Error
              ? startError.message
              : i18n.t("story.error.initFailed"),
        });
      }
    } finally {
      if (get().initializationId === currentId) {
        set({ isLoading: false });
      }
    }
  },

  setCurrentNode: (node, options) => {
    set({ currentNode: node, error: null });
    const applyError = safelyApplyStoryNodeOutputBundle(
      node,
      {
        transitionSound: options?.transitionSound,
        sourceActionType: options?.sourceActionType,
        terminalLinesOverride: options?.terminalLinesOverride,
        source: options?.source ?? (options?.sourceActionType === "command" ? "terminal" : undefined),
      }
    );
    if (applyError) {
      set({ error: applyError });
    }

    const autoInputValue = getAutoSystemInputValue(node);
    if (autoInputValue) {
      const autoAdvanceDelayMs = getAutoAdvanceDelayMs(node);
      if (autoAdvanceDelayMs !== undefined) {
        window.setTimeout(() => {
          const state = get();
          if (state.currentNode?.id === node.id && !state.isLoading) {
            useLucasStore.getState().endDialogue();
            void state.submitStoryAction("system", autoInputValue);
          }
        }, autoAdvanceDelayMs);
        return;
      }

      const scheduleAutoAction = () => {
        const lucasState = useLucasStore.getState();
        // 대화가 진행 중이면 끝날 때까지 500ms마다 재확인
        if (lucasState.isDialogueActive) {
          window.setTimeout(scheduleAutoAction, 500);
          return;
        }

        // 대화가 끝났거나 없는 경우 0.5초 뒤 액션 실행
        window.setTimeout(() => {
          const state = get();
          if (state.currentNode?.id === node.id && !state.isLoading) {
            void state.submitStoryAction("system", autoInputValue);
          }
        }, 500);
      };

      scheduleAutoAction();
    }
  },

  submitStoryAction: async (actionType, inputValue, meta) => {
    const currentNode = get().currentNode;
    if (!currentNode) {
      set({ error: i18n.t("story.error.nodeNotFound") });
      return;
    }

    if (currentNode.nodeType === "ending" || currentNode.isTerminal) {
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
      const transitionPlaySound = extractTransitionPlaySound(response.effects);
      const actionSource = getActionSource(meta);

      if (response.result === "stay") {
        applyTerminalResult(response.terminalResult, actionSource);
        set({ currentNode, error: null });
        return;
      }

      if (!response.nextNode) {
        throw new Error(i18n.t("story.error.nextNodeNotFound"));
      }

      const normalizedNextNode = normalizeTransitionNodeResponse(response.nextNode);

      if (response.result === "retry") {
        // Reflect fail node as current runtime context first.
        set({ currentNode: normalizedNextNode, error: null });
        const terminalLinesOverride = getRetryTerminalLinesOverride(
          actionType,
          inputValue,
          currentNode.code,
          normalizedNextNode.code
        );
        const applyError = safelyApplyStoryNodeOutputBundle(
          normalizedNextNode,
          {
            transitionSound: transitionPlaySound,
            sourceActionType: actionType,
            terminalLinesOverride,
            source: actionSource,
          }
        );
        if (
          shouldShowUnavailableCommandToast(
            actionType,
            inputValue,
            currentNode.code,
            normalizedNextNode.code
          )
        ) {
          showUnavailableCommandToast();
        }
        if (applyError) {
          set({ error: applyError });
        }

        if (shouldAutoDismissRetryNode(actionType, normalizedNextNode)) {
          try {
            const dismissResponse = await storyApi.submitTransition({
              nodeId: normalizedNextNode.id,
              actionType: "click",
              inputValue: "dismiss",
            });
            if (!dismissResponse.nextNode) {
              throw new Error(i18n.t("story.error.nextNodeNotFound"));
            }

            const normalizedDismissNode = normalizeTransitionNodeResponse(dismissResponse.nextNode);
            const dismissTransitionSound = extractTransitionPlaySound(dismissResponse.effects);

            if (dismissResponse.result === "retry") {
              set({ currentNode: normalizedDismissNode, error: null });
              const dismissApplyError = safelyApplyStoryNodeOutputBundle(
                normalizedDismissNode,
                {
                  transitionSound: dismissTransitionSound,
                  sourceActionType: "click",
                  terminalLinesOverride: getAutoDismissTerminalLinesOverride(normalizedDismissNode),
                }
              );
              if (dismissApplyError) {
                set({ error: dismissApplyError });
              }
            } else {
              get().setCurrentNode(normalizedDismissNode, {
                transitionSound: dismissTransitionSound,
                sourceActionType: "click",
                terminalLinesOverride: getAutoDismissTerminalLinesOverride(normalizedDismissNode),
              });
            }
          } catch (dismissError) {
            if (isTransitionNotAllowedError(dismissError)) {
              // Keep runtime playable when backend still keeps progress node on retry.
              set({ currentNode, error: null });
            } else {
              throw dismissError;
            }
          }
        }
      } else {
        get().setCurrentNode(normalizedNextNode, {
          transitionSound: transitionPlaySound,
          sourceActionType: actionType,
          // 성공적인 노드 전이는 게임의 전역 상태 변경을 의미하므로,
          // 어디서 명령어가 시작되었든 간에 해당 노드의 터미널 출력물을 정상적으로 표시해야 함.
          // 따라서 source 속성을 명시적으로 브라우저로 넘기지 않음 (기본값 활용).
        });
      }
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : i18n.t("story.error.transitionFailed"),
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

  resetStoryRuntime: () => {
    useBrowserContentStore.getState().resetContent();
    useClientStore.getState().resetClientStore();
    useMessengerStore.getState().resetMessenger();
    useLucasStore.getState().resetLucas();
    useCallOverlayStore.getState().resetCallOverlay();
    useWindowStore.getState().resetWindows();
    useNotepadStore.getState().resetNotepad();

    set((state) => ({
      currentNode: null,
      isLoading: false,
      error: null,
      // initializationId는 리셋하지 않음 (monotonically increasing)
      initializationId: state.initializationId,
    }));
  },
}));
