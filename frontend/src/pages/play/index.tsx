import { useParams } from "react-router-dom";
import { Desktop } from "../../widgets/Desktop";
import FullscreenEnforcer from "../../shared/ui/FullscreenEnforcer/FullscreenEnforcer";

export default function PlayPage() {
  const { chapterCode } = useParams();

  return (
    <main className="h-screen w-screen overflow-hidden">
      <FullscreenEnforcer />
      <Desktop />

      {/* Hidden info for development/debugging */}
      {/* <div className="absolute top-2 right-2 text-[8px] text-white/20 pointer-events-none">
        CODE: {chapterCode}
      </div> */}
    </main>
  );
}
