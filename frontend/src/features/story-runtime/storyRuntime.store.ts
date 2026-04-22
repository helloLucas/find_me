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
import { userApi } from "../../shared/api/userApi";

type StoryRuntimeState = {
  currentNode: StoryNode | null;
  isLoading: boolean;
  error: string | null;
  initializeStory: (chapterCode: string) => Promise<void>;
  setCurrentNode: (node: StoryNode) => void;
  submitStoryClick: (inputValue: string) => Promise<void>;
};

function resolveChapterCode(chapterCode: string) {
  // TODO: 챕터 해시 해석 방식이 확정되면 임시 라우트 코드 매핑을 제거한다.
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
    // TODO: 운영 로깅 체계가 도입되면 사용자 프로필 동기화 실패를 수집한다.
  }
}

function applyStoryNodeOutputBundle(node: StoryNode) {
  const outputBundle = node.outputBundle;
  if (!outputBundle) return;

  const normalizedOutput = normalizeStoryOutputBundle(outputBundle);

  // TODO: 오디오 런타임이 도입되면 scene.bgm을 연결한다.
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
    await syncAuthenticatedUserProfile();

    try {
      // TODO: 플레이 진입 UX가 확정되면 새 시작과 이어하기를 분기한다.
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
  },

  submitStoryClick: async (inputValue) => {
    const currentNode = get().currentNode;
    if (!currentNode) {
      set({ error: "현재 스토리 노드를 찾을 수 없습니다." });
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
        error: error instanceof Error ? error.message : "스토리 전이에 실패했습니다.",
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));
