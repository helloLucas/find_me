import React, { useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../app/store/authStore";

function formatSeoulTimestamp(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${getPart("year")}-${getPart("month")}-${getPart("day")} ${getPart("hour")}:${getPart("minute")}:${getPart("second")} KST`;
}

export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const nickname = useAuthStore((state) => state.nickname);
  const seoulTimestamp = useMemo(() => formatSeoulTimestamp(new Date()), []);

  useEffect(() => {
    // 백엔드로 404 접근 로그 전송 (비동기)
    // 실제 운영 시에는 해당 엔드포인트가 존재하는지 확인 후 사용합니다.
    const log404Error = async () => {
      try {
        await fetch("/api/v1/logs/404", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: location.pathname,
            nickname: nickname || "ANONYMOUS",
            timestamp: seoulTimestamp,
            timezone: "Asia/Seoul",
          }),
        });
      } catch (e) {
        // 백그라운드 로깅 실패는 유저 경험에 영향을 주지 않도록 조용히 넘깁니다.
        console.error("Failed to log 404 error", e);
      }
    };

    void log404Error();
  }, [location.pathname, nickname, seoulTimestamp]);



  return (
    <div className="relative w-screen h-screen bg-[#0b0216] text-[#22C55E] font-pixel tracking-widest overflow-hidden select-none flex flex-col items-center justify-center">
      {/* CRT Curvature and Scanline Overlay */}
      <div className="absolute inset-0 crt-overlay pointer-events-none z-10" />
      <div className="scanline" />

      {/* Main Content */}
      <div className="z-20 flex flex-col items-center max-w-3xl px-6 text-center space-y-8">

        {/* 404 Header */}
        <div className="flex flex-col items-center">
          <h1 className="text-8xl md:text-[10rem] font-bold tracking-[0.2em] drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]">
            404
          </h1>
          <div className="h-1 w-full bg-[#22C55E] mt-2 opacity-80 shadow-[0_0_10px_#22C55E]" />
        </div>


        {/* Error Messages */}
        <div className="bg-[#22C55E]/10 border border-[#22C55E]/50 p-6 shadow-[inset_0_0_20px_rgba(34,197,94,0.15)] relative">
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#22C55E]" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#22C55E]" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#22C55E]" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#22C55E]" />

          <h2 className="text-xl md:text-2xl font-bold mb-4 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)] tracking-[0.1em]">
            CRITICAL SYSTEM ERROR: DATA SEGMENT NOT FOUND
          </h2>
          <p className="text-sm md:text-base text-white mb-4 leading-loose">
            시스템 경고: 요청한 URL 경로는 손상되었거나 존재하지 않습니다.
          </p>

          {/* Sub Message System Logs */}
          <div className="bg-black/50 p-3 text-xs md:text-sm text-[#16A34A] text-left border-l-4 border-[#22C55E]">
            <p>&gt; TIMESTAMP: {seoulTimestamp}</p>
            <p>&gt; ERR_CODE: NF_001</p>
            <p>&gt; ATTEMPTED_ACCESS: <span className="text-white">{location.pathname}</span></p>
          </div>
        </div>

        {/* Return Button */}
        <button
          onClick={() => navigate(-1)}
          className="group relative px-6 py-3 border-2 border-[#22C55E] text-[#22C55E] font-bold text-lg tracking-[0.15em] hover:bg-[#22C55E] hover:text-black transition-all duration-300 shadow-[0_0_10px_rgba(34,197,94,0.4)] hover:shadow-[0_0_20px_rgba(34,197,94,0.8)] overflow-hidden"
        >
          <span className="relative z-10">&gt; RECOVER PREVIOUS NODE</span>
          <div className="absolute inset-0 h-full w-0 bg-[#22C55E] transition-all duration-300 ease-out group-hover:w-full z-0" />
        </button>
      </div>
    </div>
  );
}
