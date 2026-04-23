import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { env } from "../../../shared/config/env";

interface PreVideoPlayerProps {
  videoUrl: string;
  onFinish: () => void;
}

export function PreVideoPlayer({ videoUrl, onFinish }: PreVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const url = `${env.cdnUrl}/videos/${videoUrl}`;

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;
    video.volume = 0.5;

    let hls: Hls | null = null;

    if (Hls.isSupported() && url.endsWith(".m3u8")) {
      hls = new Hls({
        debug: false,
        enableWorker: true,
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(console.error);
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(console.error);
      });
    } else {
      // For mp4 or other types if provided
      video.src = url;
      video.play().catch(console.error);
    }

    const handleEnded = () => {
      onFinish();
    };

    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("ended", handleEnded);
      if (hls) {
        hls.destroy();
      }
    };
  }, [videoUrl, onFinish]);

  return (
    <div className="fixed inset-0 z-[10000] bg-black flex items-center justify-center overflow-hidden select-none">
      <video
        ref={videoRef}
        className="w-full h-full object-contain pointer-events-none"
        playsInline
      />
      <button
        onClick={onFinish}
        className="absolute bottom-8 right-8 z-[10001] bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-md px-6 py-2 rounded font-pixel transition-all cursor-pointer"
      >
        SKIP ⏭
      </button>
    </div>
  );
}
