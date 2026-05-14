import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Desktop } from "../../widgets/Desktop";
import FullscreenEnforcer from "../../shared/ui/FullscreenEnforcer/FullscreenEnforcer";
import { useStoryRuntimeStore } from "../../features/story-runtime/storyRuntime.store";
import { normalizeStoryOutputBundle } from "../../features/story-runtime/outputBundle.adapters";
import { PreVideoPlayer } from "../../features/story-runtime/ui/PreVideoPlayer";
import { audioManager } from "../../features/story-runtime/audioManager";
import { ChapterCompletionModal } from "../../widgets/ChapterCompletionModal";
import { EndingResultOverlay } from "../../widgets/EndingResultOverlay";
import { trackAnalyticsEvent } from "../../shared/analytics";
import { useTrackVisible } from "../../shared/analytics/useTrackVisible";
import type { StoryNode } from "../../shared/types/story";

function getIsFullscreen() {
  return !!document.fullscreenElement || (window.innerHeight === screen.height);
}

function isChapterCompletionNode(node: StoryNode | null) {
  return Boolean(node && (node.nodeType === "ending" || node.isTerminal));
}

function getEndingType(node: StoryNode | null): string | null {
  const effects = node?.outputBundle?.effects;
  if (!effects || typeof effects !== "object" || Array.isArray(effects)) {
    return null;
  }

  const endingType = (effects as Record<string, unknown>).endingType;
  return typeof endingType === "string" && endingType.trim() ? endingType : null;
}

export default function PlayPage() {
  const { chapterCode } = useParams();
  const { initializeStory, currentNode } = useStoryRuntimeStore();
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [currentPreVideoUrl, setCurrentPreVideoUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const processedNodeIdRef = useRef<number | string | null>(null);
  const playViewRef = useTrackVisible<HTMLElement>({
    eventName: "play_screen_visible_10s",
    params: { chapter_code: chapterCode ?? "unknown" },
    minVisibleMs: 10000,
  });

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(getIsFullscreen());
    };

    syncFullscreenState();

    document.addEventListener("fullscreenchange", syncFullscreenState);
    window.addEventListener("resize", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      window.removeEventListener("resize", syncFullscreenState);
    };
  }, []);

  useEffect(() => {
    audioManager.enableGlobalClickSfx("mouse_click_v1.mp3");
    initializeStory(chapterCode ?? "week01");
    processedNodeIdRef.current = null;

    // 플레이 진입(마운트/종료 후 재시작) 시 해당 챕터 메모장 로컬 데이터 초기화
    if (chapterCode) {
      localStorage.removeItem(`notebook_memo_tabs_${chapterCode}`);
      localStorage.removeItem(`notebook_memo_active_tab_id_${chapterCode}`);
      localStorage.removeItem("notebook_memo_content");
    }

    return () => {
      audioManager.disableGlobalClickSfx();
      audioManager.setStoryVideoPlaying(false);
      audioManager.stopBgm();
      // 퇴장 시 스토리 런타임 상태 초기화 (다른 챕터 진입 시 잔상 방지)
      useStoryRuntimeStore.getState().resetStoryRuntime();
    };
  }, [chapterCode, initializeStory]);

  useEffect(() => {
    if (currentNode && isFullscreen && processedNodeIdRef.current !== currentNode.id) {
      processedNodeIdRef.current = currentNode.id;
      const output = normalizeStoryOutputBundle(currentNode.outputBundle);
      if (output.scene.preVideo) {
        audioManager.stopBgm();
        audioManager.setStoryVideoPlaying(true);
        setIsPlayingVideo(true);
        setCurrentPreVideoUrl(output.scene.preVideo);
      } else {
        audioManager.setStoryVideoPlaying(false);
        audioManager.playBgm(output.scene.bgm);
      }
      trackAnalyticsEvent("story_node_entered", {
        chapter_code: chapterCode ?? "unknown",
        node_code: currentNode.code,
        has_pre_video: Boolean(output.scene.preVideo),
        is_terminal: Boolean(currentNode.isTerminal),
      });
    }
  }, [chapterCode, currentNode, isFullscreen]);

  const handleVideoFinish = () => {
    trackAnalyticsEvent("pre_video_finished", {
      chapter_code: chapterCode ?? "unknown",
      node_code: currentNode?.code ?? "unknown",
    });
    audioManager.setStoryVideoPlaying(false);
    setIsPlayingVideo(false);
    setCurrentPreVideoUrl(null);
    if (currentNode) {
      const output = normalizeStoryOutputBundle(currentNode.outputBundle);
      audioManager.playBgm(output.scene.bgm);
    }
  };

  const currentEndingType = getEndingType(currentNode);
  const shouldShowEndingOverlay =
    !isPlayingVideo && currentNode?.nodeType === "ending" && Boolean(currentEndingType);
  const shouldShowCompletionModal =
    !isPlayingVideo && !shouldShowEndingOverlay && isChapterCompletionNode(currentNode);

  return (
    <main ref={playViewRef} className="h-screen w-screen overflow-hidden">
      {isPlayingVideo && currentPreVideoUrl ? (
        <PreVideoPlayer videoUrl={currentPreVideoUrl} onFinish={handleVideoFinish} />
      ) : (
        <Desktop />
      )}
      {!isFullscreen && <FullscreenEnforcer />}



      {shouldShowCompletionModal && <ChapterCompletionModal />}

      {shouldShowEndingOverlay && <EndingResultOverlay endingType={currentEndingType} />}

      {/* Hidden info for development/debugging */}
      {/* <div className="absolute top-2 right-2 text-[8px] text-white/20 pointer-events-none">
        CODE: {chapterCode}
      </div> */}
    </main >
  );
}
