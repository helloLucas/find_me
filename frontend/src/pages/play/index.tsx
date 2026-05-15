import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Desktop } from "../../widgets/Desktop";
import FullscreenEnforcer from "../../shared/ui/FullscreenEnforcer/FullscreenEnforcer";
import { useStoryRuntimeStore } from "../../features/story-runtime/storyRuntime.store";
import { normalizeStoryOutputBundle } from "../../features/story-runtime/outputBundle.adapters";
import { PreVideoPlayer } from "../../features/story-runtime/ui/PreVideoPlayer";
import { audioManager } from "../../features/story-runtime/audioManager";
import { ChapterCompletionModal } from "../../widgets/ChapterCompletionModal";
import { EndingResultOverlay } from "../../widgets/EndingResultOverlay";
import { PlayConnectionBanner } from "../../widgets/PlayConnectionBanner";
import { EndingCredits } from "../../widgets/EndingCredits";
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
  const navigate = useNavigate();
  const initializeStory = useStoryRuntimeStore((state) => state.initializeStory);
  const currentNode = useStoryRuntimeStore((state) => state.currentNode);
  const isLoading = useStoryRuntimeStore((state) => state.isLoading);
  const error = useStoryRuntimeStore((state) => state.error);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [currentPreVideoUrl, setCurrentPreVideoUrl] = useState<string | null>(null);
  const [showCredits, setShowCredits] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const processedNodeIdRef = useRef<number | string | null>(null);
  const lastChapterRef = useRef<string | null>(null);
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
    
    // Only reset state if the chapterCode has changed
    if (chapterCode !== lastChapterRef.current) {
      lastChapterRef.current = chapterCode ?? null;
      if (chapterCode) {
        initializeStory(chapterCode);
      }
      processedNodeIdRef.current = null;
      setIsPlayingVideo(false);
      setCurrentPreVideoUrl(null);
      setShowCredits(false);
    }

    // 플레이 진입(마운트/종료 후 재시작) 시 해당 챕터 메모장 로컬 데이터 초기화
    /*
    if (chapterCode) {
      localStorage.removeItem(`notebook_memo_tabs_${chapterCode}`);
      localStorage.removeItem(`notebook_memo_active_tab_id_${chapterCode}`);
      localStorage.removeItem("notebook_memo_content");
    }
    */

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
    !isPlayingVideo && !showCredits && currentNode?.nodeType === "ending" && Boolean(currentEndingType);
  const shouldShowCompletionModal =
    !isPlayingVideo && !showCredits && !shouldShowEndingOverlay && isChapterCompletionNode(currentNode);

  return (
    <main ref={playViewRef} className="h-screen w-screen overflow-hidden">
      {!currentNode ? (
        <div className="h-full w-full bg-black text-white flex flex-col items-center justify-center gap-4 px-6 text-center font-system-overlay">
          <div className="text-[#a3e635] text-sm tracking-[0.35em] animate-pulse">
            {isLoading ? "CONNECTING_TO_STORY_SERVER" : "STORY_SERVER_UNAVAILABLE"}
          </div>
          {!isLoading && (
            <p className="text-white/70 text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
              {error ?? "챕터를 시작할 수 없습니다.\n네트워크 상태를 확인해 주세요."}
            </p>
          )}
        </div>
      ) : isPlayingVideo && currentPreVideoUrl ? (
        <PreVideoPlayer videoUrl={currentPreVideoUrl} onFinish={handleVideoFinish} />
      ) : showCredits ? (
        <EndingCredits onComplete={() => navigate("/")} />
      ) : (
        <Desktop />
      )}
      {currentNode && !isFullscreen && <FullscreenEnforcer />}

      <PlayConnectionBanner />

      {shouldShowCompletionModal && <ChapterCompletionModal />}

      {shouldShowEndingOverlay && (
        <EndingResultOverlay
          endingType={currentEndingType}
          onPrimaryAction={() => setShowCredits(true)}
        />
      )}

      {/* Hidden info for development/debugging */}
      {/* <div className="absolute top-2 right-2 text-[8px] text-white/20 pointer-events-none">
        CODE: {chapterCode}
      </div> */}
    </main >
  );
}
