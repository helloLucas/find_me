import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Desktop } from "../../widgets/Desktop";
import FullscreenEnforcer from "../../shared/ui/FullscreenEnforcer/FullscreenEnforcer";
import { useStoryRuntimeStore } from "../../features/story-runtime/storyRuntime.store";
import { normalizeStoryOutputBundle } from "../../features/story-runtime/outputBundle.adapters";
import { PreVideoPlayer } from "../../features/story-runtime/ui/PreVideoPlayer";
import { audioManager } from "../../features/story-runtime/audioManager";
import { ChapterCompletionModal } from "../../widgets/ChapterCompletionModal";
import { trackAnalyticsEvent } from "../../shared/analytics";
import { useTrackVisible } from "../../shared/analytics/useTrackVisible";
import type { StoryNode } from "../../shared/types/story";

function getIsFullscreen() {
  return !!document.fullscreenElement || (window.innerHeight === screen.height);
}

function isChapterCompletionNode(node: StoryNode | null) {
  if (!node?.code.endsWith("_COMPLETE")) return false;

  return node.nodeType === "ending" || node.isTerminal;
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
    return () => {
      audioManager.disableGlobalClickSfx();
      audioManager.setStoryVideoPlaying(false);
      audioManager.stopBgm();
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

  const shouldShowCompletionModal = !isPlayingVideo && isChapterCompletionNode(currentNode);

  return (
    <main ref={playViewRef} className="h-screen w-screen overflow-hidden">
      {isPlayingVideo && currentPreVideoUrl ? (
        <PreVideoPlayer videoUrl={currentPreVideoUrl} onFinish={handleVideoFinish} />
      ) : (
        <Desktop />
      )}
      {!isFullscreen && <FullscreenEnforcer />}



      {shouldShowCompletionModal && (
        <ChapterCompletionModal />
      )}

      {/* Hidden info for development/debugging */}
      {/* <div className="absolute top-2 right-2 text-[8px] text-white/20 pointer-events-none">
        CODE: {chapterCode}
      </div> */}
    </main>
  );
}
