import { useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Desktop } from "../../widgets/Desktop";
import FullscreenEnforcer from "../../shared/ui/FullscreenEnforcer/FullscreenEnforcer";
import { useStoryRuntimeStore } from "../../features/story-runtime/storyRuntime.store";
import { normalizeStoryOutputBundle } from "../../features/story-runtime/outputBundle.adapters";
import { PreVideoPlayer } from "../../features/story-runtime/ui/PreVideoPlayer";
import { audioManager } from "../../features/story-runtime/audioManager";

export default function PlayPage() {
  const { chapterCode } = useParams();
  const { error, initializeStory, currentNode } = useStoryRuntimeStore();
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [currentPreVideoUrl, setCurrentPreVideoUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const processedNodeIdRef = useRef<number | string | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    initializeStory(chapterCode ?? "week01");
    processedNodeIdRef.current = null;
    return () => {
      audioManager.stopBgm();
    };
  }, [chapterCode, initializeStory]);

  useEffect(() => {
    if (currentNode && isFullscreen && processedNodeIdRef.current !== currentNode.id) {
      processedNodeIdRef.current = currentNode.id;
      const output = normalizeStoryOutputBundle(currentNode.outputBundle);
      if (output.scene.preVideo) {
        setIsPlayingVideo(true);
        setCurrentPreVideoUrl(output.scene.preVideo);
      } else {
        audioManager.playBgm(output.scene.bgm);
      }
    }
  }, [currentNode, isFullscreen]);

  const handleVideoFinish = () => {
    setIsPlayingVideo(false);
    setCurrentPreVideoUrl(null);
    if (currentNode) {
      const output = normalizeStoryOutputBundle(currentNode.outputBundle);
      audioManager.playBgm(output.scene.bgm);
    }
  };

  return (
    <main className="h-screen w-screen overflow-hidden">
      {!isFullscreen ? (
        <FullscreenEnforcer />
      ) : (
        <>
          {isPlayingVideo && currentPreVideoUrl ? (
            <PreVideoPlayer videoUrl={currentPreVideoUrl} onFinish={handleVideoFinish} />
          ) : (
            <Desktop />
          )}
        </>
      )}

      {error && (
        <div className="absolute left-4 top-4 z-[100] max-w-[360px] rounded border border-red-400/50 bg-black/80 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      {/* Hidden info for development/debugging */}
      {/* <div className="absolute top-2 right-2 text-[8px] text-white/20 pointer-events-none">
        CODE: {chapterCode}
      </div> */}
    </main>
  );
}
