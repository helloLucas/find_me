import { create } from "zustand";
import { useAuthStore } from "../../app/store/authStore";
import { useBrowserContentStore } from "../../app/store/browserContentStore";
import { useClientStore } from "../../app/store/clientStore";
import { useToastStore } from "../../app/store/toastStore";
import { useLucasStore } from "../../app/store/lucasStore";
import { useMessengerStore } from "../../app/store/messengerStore";
import { useWindowStore } from "../../app/store/windowStore";
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
};
const MAPLE_STORY_TERMINAL_SIGNAL = "terminal://maple-story";

const CHAT_NOTIFICATION_SOUND = "notification_v1.mp3";
const LUCAS_BUBBLE_SOUND = "notification_lucas_v1.mp3";
const MOUSE_CLICK_SOUND = "mouse_click_v1.mp3";
const CLEAR_TERMINAL_SIGNAL = "__CLEAR_TERMINAL__";


function resolveChapterCode(chapterCode: string) {
  if (chapterCode === "ch1" || chapterCode === "stage1" || chapterCode === "week1") {
    return "week01";
  }

  return chapterCode || "week01";
}

function buildLucasChatScope(chapterCode: string) {
  const auth = useAuthStore.getState();
  const actor = auth.isLoggedIn ? auth.nickname || "member" : "guest";
  return `lucas:${actor}:${chapterCode}`;
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

function parseTerminalPromptContext(line: string): TerminalPromptContext | undefined {
  const match = line.match(/^([^@\s]+)@([^:\s]+):([^\r\n$]+)\$$/);
  if (!match) return undefined;

  return {
    sourceLine: line,
    user: match[1],
    host: match[2],
    path: match[3],
  };
}

function applyStoryNodeOutputBundle(
  node: StoryNode,
  options: ApplyStoryNodeOutputOptions = {}
) {
  const outputBundle = node.outputBundle;
  if (!outputBundle) return;

  const normalizedOutput = normalizeStoryOutputBundle(outputBundle);

  const entrySfx = resolveNodeEntrySfx(
    normalizedOutput,
    options.transitionSound,
    options.sourceActionType
  );
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

  const content = objectRecord(normalizedOutput.content) ?? {};
  const documentId = stringValue(content.documentId);

  if (shouldOpenBrowserForStoryNode(node, normalizedOutput)) {
    useWindowStore.getState().openWindow("browser", "Web Browser", undefined, "chrome");
  }

  if (node.code.startsWith("CH2_") || node.isTerminal) {
    useWindowStore.getState().openWindow("terminal", "Terminal", undefined, "terminal");
  }

  if (node.code === "CH2_RECOVERED_DOCUMENT") {
    useWindowStore.getState().openWindow(
      "document_viewer",
      "FRAGMENT_RECOVERED_082.PDF",
      documentId
    );
  }

  if (node.code.startsWith("CH2_") || node.isTerminal) {
    useWindowStore.getState().openWindow("terminal", "Terminal", undefined, "terminal");
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
    node.code === "CH1_SSH_CONNECTED" || node.code === "CH2_SERVER_HOME"
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
  } else if (node.code.startsWith("CH2_")) {
    // Automatically switch to lucas-server context when in Chapter 2
    clientStore.setTerminalContext("guest", "lucas-server", "~");
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
      : "스토리 출력 반영에 실패했습니다.";
  }

  return null;
}

function getAutoSystemInputValue(node: StoryNode) {
  return AUTO_SYSTEM_TRANSITIONS[node.code];
}

function getCommandNotFoundLine(inputValue: string | undefined) {
  const commandName = inputValue?.trim().split(/\s+/)[0];
  return `${commandName || "command"}: command not found`;
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

function applyTerminalResult(terminalResult: TerminalResult | undefined, source?: "terminal" | "browser") {
  if (!terminalResult) return;
  
  // 브라우저에서 보낸 명령어의 결과물(stdout/stderr)은 터미널에 출력하지 않음
  if (source === "browser") return;

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
    if (line === CLEAR_TERMINAL_SIGNAL) {
      clientStore.clearTerminalOutput();
      continue;
    }

    if (line === MAPLE_STORY_TERMINAL_SIGNAL) {
      useWindowStore.getState().openWindow("terminal2");
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
  initializeStory: async (chapterCode) => {
    if (get().isLoading) return;
    // 이전 플레이 세션의 모든 게임 상태를 초기화하여 처음부터 시작
    get().resetStoryRuntime();
    useBrowserContentStore.getState().resetContent();
    useClientStore.getState().resetClientStore();
    useMessengerStore.getState().resetMessenger();
    useLucasStore.getState().resetLucas();
    useWindowStore.getState().resetWindows();

    set({ isLoading: true, error: null });
    useAuthStore.getState().checkAuth();

    await syncAuthenticatedUserProfile();

    try {
      const node = normalizeStoryNodeResponse(
        await storyApi.startStory(resolvedChapterCode)
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
      const transitionPlaySound = extractTransitionPlaySound(response.effects);
      const actionSource = getActionSource(meta);

      if (response.result === "stay") {
        applyTerminalResult(response.terminalResult, actionSource);
        set({ currentNode, error: null });
        return;
      }

      if (!response.nextNode) {
        throw new Error("스토리 전이 응답에 다음 노드 정보가 없습니다.");
      }

      const normalizedNextNode = normalizeTransitionNodeResponse(response.nextNode);

      if (response.result === "stay") {
        applyTerminalResult(response.terminalResult, actionSource);
        set({ currentNode, error: null });
        return;
      }

      if (!response.nextNode) {
        throw new Error("스토리 전이 응답에 다음 노드 정보가 없습니다.");
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
              throw new Error("스토리 전이 응답에 다음 노드 정보가 없습니다.");
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
