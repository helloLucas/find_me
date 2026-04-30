import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStatus } from '../../shared/hooks/useAuthStatus';
import { ChapterList } from '../../widgets/ChapterList';
import { GuestWarningBar } from '../../shared/ui/GuestWarningBar';

/**
 * Lobby 메인 페이지 (Unified Dark Gray Theme)
 * - 로그인 유저와 게스트 유저 모두 동일한 다크 테마 UI를 공유합니다.
 * - BFCache(뒤로가기 캐시) 무효화 및 레이아웃 흔들림(Layout Shift)을 방지합니다.
 */
const LobbyPage = () => {
    const { nickname, sessionMode, isGuest, isLoading } = useAuthStatus();
    const navigate = useNavigate();

    // BFCache 및 로컬 브라우저 캐시(뒤로가기 시 이전 DOM 복원) 방지
    useEffect(() => {
        // 1. Performance API를 통한 뒤로가기 감지 (브라우저 히스토리 탐색)
        const perfEntries = performance.getEntriesByType("navigation");
        if (perfEntries.length > 0) {
            const navEntry = perfEntries[0] as PerformanceNavigationTiming;
            if (navEntry.type === "back_forward") {
                window.location.reload();
                return;
            }
        }

        // 2. PageShow 이벤트를 통한 BFCache (메모리 스냅샷) 감지
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                window.location.reload();
            }
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, []);

    // 레이아웃 흔들림(Layout Shift) 방지를 위한 공통 쉘 컴포넌트 렌더러
    const renderShell = (content: React.ReactNode, warningBar?: React.ReactNode) => (
        <div className="select-none h-screen w-screen overflow-hidden flex flex-col relative p-4 md:p-8 bg-darkbg text-white font-lobby">
            {/* Header */}
            <header className="shrink-0 flex justify-between items-center w-full max-w-5xl mx-auto tracking-widest border-b border-gray-800 pb-3 mb-4 transition-opacity duration-300">
                <div className="flex gap-6 items-center">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-sm md:text-lg font-bold text-gray-300 hover:text-[#a3e635] transition-all group"
                    >
                        <span className="text-gray-500 group-hover:text-[#a3e635]">{" < "}</span>
                        <span className="border-b border-transparent group-hover:border-[#a3e635]">BACK</span>
                    </button>
                    <div className="flex flex-col gap-0.5 border-l border-gray-800 pl-6 opacity-30 select-none">
                        <div className="flex items-center gap-2 text-[8px] uppercase tracking-tighter">
                            <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-pulse"></span>
                            <span>TRANSCEIVER_ACTIVE</span>
                        </div>
                        <div className="text-[10px] text-gray-500">LOBBY_V.04</div>
                    </div>
                </div>
                <div className="flex gap-6">
                    {isLoading ? (
                        <div className="h-4 w-32 bg-gray-800 animate-pulse rounded"></div>
                    ) : (
                        <>
                            <span className="text-white font-bold border-b border-white pb-1 tracking-tight">AGENT: {nickname}</span>
                            <span className="hidden md:inline">SESS: {sessionMode}</span>
                        </>
                    )}
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center w-full max-w-4xl mx-auto min-h-0 relative">
                {/* 우측 상단 플로팅 경고 바 (Top-Right Placement) */}
                <div className={`absolute -top-1 right-0 md:right-0 z-[60] transition-all duration-300 ${isGuest && !isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
                    {warningBar}
                </div>

                {/* 타이틀 */}
                <h1 className="shrink-0 text-3xl md:text-4xl tracking-[0.3em] mt-4 mb-4 text-white font-bold drop-shadow-lg uppercase text-center">
                    SELECT CHAPTER
                </h1>

                {/* 메인 콘텐츠 영역 */}
                <div className="w-full flex-1 min-h-0 flex flex-col relative overflow-hidden">
                    {content}
                </div>

                {/* 하단 고정 영역 제거 (상단으로 이동됨) */}
                <div className="w-full shrink-0 flex items-end">
                </div>
            </main>

            {/* 푸터 */}
            <footer className="shrink-0 w-full max-w-4xl mx-auto mt-4 text-center text-[9px] text-gray-700 tracking-[0.4em] border-t border-gray-900 pt-4 pb-2 uppercase">
                NEURAL-INTERFACE CONNECTION ESTABLISHED // OPTIMAL_FLOW
            </footer>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 2px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #374151; }
            `}</style>
        </div>
    );

    // 1. 초기 로딩 상태: FOUC (깜빡임) 방지. UI 구조는 그대로 렌더링
    if (isLoading) {
        return renderShell(
            <div className="w-full h-full flex flex-col gap-3">
                {[1, 2, 3, 4].map(idx => (
                    <div key={idx} className="flex-1 border border-gray-800/20 bg-gray-900/10 rounded-sm animate-pulse"></div>
                ))}
            </div>
        );
    }

    // 2. 데이터 로드 완료 상태
    return renderShell(
        <div className="w-full h-full flex flex-col gap-3 overflow-y-auto custom-scrollbar pb-2 relative">
            <ChapterList />
        </div>,
        isGuest ? <GuestWarningBar /> : null
    );
};

export default LobbyPage;
