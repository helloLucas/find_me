import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStatus } from '../../shared/hooks/useAuthStatus';
import { ChapterList } from '../../widgets/ChapterList';
import { GuestWarningBar } from '../../shared/ui/GuestWarningBar';
import { useUpdateNickname } from '../../features/User/useUpdateNickname';
import { useAuthStore } from '../../app/store/authStore';
import { trackAnalyticsEvent } from '../../shared/analytics';
import { useTrackVisible } from '../../shared/analytics/useTrackVisible';

/**
 * Lobby 메인 페이지 (Unified Dark Gray Theme)
 * - 로그인 유저와 게스트 유저 모두 동일한 다크 테마 UI를 공유합니다.
 * - BFCache(뒤로가기 캐시) 무효화 및 레이아웃 흔들림(Layout Shift)을 방지합니다.
 */
const LobbyPage = () => {
    const { nickname, sessionMode, isGuest, isLoading } = useAuthStatus();
    const navigate = useNavigate();
    const { mutate: updateNickname, isPending: isUpdating } = useUpdateNickname();
    const lobbyViewRef = useTrackVisible<HTMLDivElement>({
        eventName: 'lobby_visible_5s',
        params: { page: 'lobby' },
        minVisibleMs: 5000,
    });

    // 닉네임 인라인 편집 상태
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [editError, setEditError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // 편집 모드 진입
    const handleEditStart = () => {
        if (isGuest) return; // 게스트는 닉네임 변경 불가
        trackAnalyticsEvent('nickname_edit_started');
        setInputValue(nickname || '');
        setEditError('');
        setIsEditing(true);
    };

    // 편집 모드 취소
    const handleEditCancel = () => {
        setIsEditing(false);
        setEditError('');
    };

    // 편집 모드 진입 시 input 포커스
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // 닉네임 저장
    const handleEditSubmit = () => {
        const trimmed = inputValue.trim();
        if (!trimmed) {
            setEditError('닉네임을 입력해 주세요.');
            return;
        }
        if (trimmed.length > 15) {
            setEditError('15자 이내로 입력해 주세요.');
            return;
        }
        if (trimmed === nickname) {
            setIsEditing(false);
            return;
        }

        updateNickname(
            { nickname: trimmed },
            {
                onSuccess: (response) => {
                    trackAnalyticsEvent('nickname_updated');
                    const newAccessToken = response.data?.accessToken;
                    if (newAccessToken) {
                        useAuthStore.getState().setAuth(newAccessToken);
                    }
                    setIsEditing(false);
                    setEditError('');
                },
                onError: () => {
                    setEditError('닉네임 변경에 실패했습니다.');
                }
            }
        );
    };

    // Enter / Escape 키 처리
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleEditSubmit();
        if (e.key === 'Escape') handleEditCancel();
    };

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
        <div ref={lobbyViewRef} className="select-none h-screen w-screen overflow-hidden flex flex-col relative p-4 md:p-8 bg-darkbg text-white font-lobby">
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
                <div className="flex gap-6 items-center">
                    {isLoading ? (
                        <div className="h-4 w-32 bg-gray-800 animate-pulse rounded"></div>
                    ) : (
                        <>
                            {/* 닉네임 영역 */}
                            <div className="flex flex-col items-end gap-0.5">
                                <button
                                    onClick={handleEditStart}
                                    data-clarity-mask="true"
                                    title={isGuest ? '소셜 로그인 후 닉네임 변경 가능' : '클릭하여 닉네임 변경'}
                                    className={`text-white font-bold border-b pb-1 tracking-[0.1em] flex items-center gap-2 group/nick transition-all ${isGuest
                                            ? 'border-white cursor-default'
                                            : 'border-white hover:border-[#a3e635] hover:text-[#a3e635] cursor-pointer'
                                        }`}
                                >
                                    <span>AGENT: {nickname}</span>
                                    {!isGuest && (
                                        <span className="flex items-center justify-center bg-[#a3e635]/10 border border-[#a3e635] text-[#a3e635] text-[10px] px-1.5 py-0.5 rounded shadow-[0_0_5px_rgba(163,230,53,0.3)] group-hover/nick:bg-[#a3e635] group-hover/nick:text-black transition-all">
                                            ✎ EDIT
                                        </span>
                                    )}
                                </button>
                            </div>
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

            {/* Nickname Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0a0a0a] border border-[#a3e635] p-6 w-80 shadow-[0_0_15px_rgba(163,230,53,0.3)] flex flex-col gap-5">
                        <div className="flex justify-between items-center border-b border-[#a3e635]/30 pb-2">
                            <h3 className="text-[#a3e635] tracking-widest font-bold text-sm uppercase">UPDATE AGENT ALIAS</h3>
                            <button onClick={handleEditCancel} className="text-gray-500 hover:text-white transition-colors">X</button>
                        </div>
                        <div className="flex flex-col gap-2">
                            <input
                                ref={inputRef}
                                data-clarity-mask="true"
                                type="text"
                                value={inputValue}
                                onChange={e => { setInputValue(e.target.value); setEditError(''); }}
                                onKeyDown={handleKeyDown}
                                maxLength={15}
                                disabled={isUpdating}
                                className="bg-black border border-[#a3e635]/50 text-white p-3 text-sm outline-none focus:border-[#a3e635] focus:shadow-[0_0_8px_rgba(163,230,53,0.3)] disabled:opacity-50 transition-all font-mono"
                                placeholder="Enter new nickname"
                            />
                            {editError ? (
                                <span className="text-[10px] text-red-400 tracking-wider h-3">{editError}</span>
                            ) : (
                                <span className="text-[10px] text-gray-500 tracking-wider h-3">Max 15 characters.</span>
                            )}
                        </div>
                        <div className="flex gap-3 justify-end mt-2">
                            <button
                                onClick={handleEditCancel}
                                disabled={isUpdating}
                                className="px-4 py-2 text-[10px] tracking-widest border border-gray-600 text-gray-400 hover:bg-gray-800 disabled:opacity-50 transition-colors"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={handleEditSubmit}
                                disabled={isUpdating}
                                className="px-4 py-2 text-[10px] tracking-widest bg-[#a3e635]/10 border border-[#a3e635] text-[#a3e635] hover:bg-[#a3e635]/20 hover:shadow-[0_0_10px_rgba(163,230,53,0.2)] disabled:opacity-50 transition-all"
                            >
                                {isUpdating ? 'UPDATING...' : 'CONFIRM'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
