import { useAuthStatus } from '../../shared/hooks/useAuthStatus';
import { ChapterList } from '../../widgets/ChapterList';
import { GuestWarningBar } from '../../shared/ui/GuestWarningBar';

/**
 * Lobby 메인 페이지 (지시사항 절대 재해석 금지 모드)
 * - 제공된 HTML 소스코드의 <body> 내부 구조와 Tailwind 클래스를 1:1로 복제
 * - 하드코딩된 텍스트 제거 및 변수 매핑
 */
const LobbyPage = () => {
    const { nickname, sessionMode, isGuest } = useAuthStatus();

    return (
        <div className="select-none h-screen w-screen overflow-hidden flex flex-col relative p-4 md:p-8 bg-darkbg text-white font-pixel">
            
            {/* [1:1 복제] Header 영역 */}
            <header className="shrink-0 flex justify-end items-center w-full max-w-4xl mx-auto text-[10px] md:text-xs text-gray-400 tracking-widest border-b border-gray-800 pb-4 mb-6">
                <div className="flex gap-6">
                    <span className="text-white font-bold border-b border-white">NICKNAME: {nickname}</span>
                    <span>SESSION: {sessionMode}</span>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center w-full max-w-4xl mx-auto min-h-0">
                
                {/* [1:1 복제] 타이틀 */}
                <h1 className="shrink-0 text-3xl md:text-4xl tracking-[0.3em] mb-6 text-white font-bold drop-shadow-lg uppercase">CHAPTER</h1>

                {/* [1:1 복제] 챕터 리스트 컨테이너 */}
                <div className="w-full flex flex-col gap-3 flex-1 min-h-0 pb-2">
                    <ChapterList />
                </div>

                {/* 게스트 경고 바 (Shared Component 연동) */}
                {isGuest && <GuestWarningBar />}

            </main>

            {/* [1:1 복제] 푸터 */}
            <footer className="shrink-0 w-full max-w-4xl mx-auto mt-4 text-center text-[9px] text-gray-700 tracking-[0.4em] border-t border-gray-900 pt-4 pb-2">
                NEURAL-INTERFACE CONNECTION ESTABLISHED // 2026.04.20
            </footer>
            
        </div>
    );
};

export default LobbyPage;
