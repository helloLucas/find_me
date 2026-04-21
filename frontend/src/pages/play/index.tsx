import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { Desktop } from "../../widgets/Desktop";
import FullscreenEnforcer from "../../shared/ui/FullscreenEnforcer/FullscreenEnforcer";
import { GlitchOverlay } from "../../shared/ui/GlitchOverlay";
import { useStoryRuntimeStore } from "../../features/story-runtime/storyRuntime.store";

export default function PlayPage() {
  const { chapterCode } = useParams();
  const { error, initializeStory } = useStoryRuntimeStore();

  useEffect(() => {
    initializeStory(chapterCode ?? "week01");
  }, [chapterCode, initializeStory]);

  return (
    <main className="h-screen w-screen overflow-hidden">
      <FullscreenEnforcer />
      <Desktop />
      <GlitchOverlay />

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
