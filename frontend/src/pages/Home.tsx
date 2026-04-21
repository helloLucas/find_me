import { useEffect, useState } from 'react';
import { useAuthStore } from '../app/store/authStore';
import { useAuthActions } from '../features/Auth/useAuthActions';
import MainMenu from '../widgets/MainMenu/MainMenu';

const Home = () => {
    const checkAuth = useAuthStore((state) => state.checkAuth);
    const { handleSystemAccess, handleGuestAccess, handleLogout } = useAuthActions();

    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    const openModal = (title: string, message: string, onConfirm: () => void) => {
        setModalConfig({ isOpen: true, title, message, onConfirm });
    };

    const closeModal = () => {
        setModalConfig((prev) => ({ ...prev, isOpen: false }));
    };

    const handleGuestClick = () => {
        openModal(
            'ANONYMOUS_ACCESS_WARNING',
            '익명 접속 시 진행 상황이 저장되지 않을 수 있습니다. 계속하시겠습니까?',
            handleGuestAccess
        );
    };

    const handleLogoutClick = () => {
        openModal(
            'LOGOUT_CONFIRMATION',
            '로그아웃 하시겠습니까? 세션이 종료됩니다.',
            handleLogout
        );
    };

    useEffect(() => {
        // [Action] 초기 진입 시 인증 상태 동기화
        checkAuth();

        // [History Resilience] 브라우저 뒤로가기/앞으로가기 발생 시 상태 재검증
        const syncAuthState = () => checkAuth();
        window.addEventListener('popstate', syncAuthState);

        // bfcache(Back-Forward Cache) 대응: 캐시된 페이지가 다시 보일 때 실행
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                checkAuth();
            }
        });

        return () => {
            window.removeEventListener('popstate', syncAuthState);
            window.removeEventListener('pageshow', syncAuthState);
        };
    }, [checkAuth]);

    const backgroundImageUrl = '/lucas_landing_background_1776648326305.png';

    return (
        <div
            className="min-h-screen w-full relative overflow-hidden bg-[#0a1118] flex flex-col justify-center select-none pixel-crisp"
            style={{
                backgroundImage: `linear-gradient(to right, rgba(10, 17, 24, 0.9) 0%, rgba(10, 17, 24, 0.4) 50%, rgba(10, 17, 24, 0.9) 100%), url(${backgroundImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <style>{`
                .pixel-crisp {
                    -webkit-font-smoothing: none;
                    -moz-osx-font-smoothing: grayscale;
                    image-rendering: crisp-edges;
                    image-rendering: pixelated;
                }
                .corner-bracket {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
                .corner-tl { top: -4px; left: -4px; border-right: 0; border-bottom: 0; }
                .corner-tr { top: -4px; right: -4px; border-left: 0; border-bottom: 0; }
                .corner-bl { bottom: -4px; left: -4px; border-right: 0; border-top: 0; }
                .corner-br { bottom: -4px; right: -4px; border-left: 0; border-top: 0; }
            `}</style>

            <div className="absolute top-20 left-16 md:top-24 md:left-24 flex flex-col">
                <header className="flex flex-col mb-16">
                    <h1 className="font-pixel text-6xl md:text-7xl text-white tracking-wide mb-4 drop-shadow-lg">
                        Hello
                    </h1>
                    <h2 className="font-pixel text-7xl md:text-8xl text-white tracking-wide leading-tight drop-shadow-xl">
                        Lucas
                    </h2>
                </header>

                <MainMenu
                    onLoginClick={handleSystemAccess}
                    onGuestClick={handleGuestClick}
                    onLogoutClick={handleLogoutClick}
                />
            </div>

            <div className="absolute bottom-10 left-16 md:left-24 opacity-30">
                <p className="font-pixel text-[9px] text-gray-700 uppercase tracking-[0.4em]">
                    Connection: Secure // Protocol: Lucas_v3
                </p>
            </div>

            {/* Custom Cyber Modal */}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md transition-all duration-500">
                    <div className="hud-fade-in relative max-w-md w-full mx-6 p-10 flex flex-col items-center gap-10">
                        {/* Glass Container */}
                        <div className="absolute inset-0 border border-white/10 bg-white/[0.03] shadow-[0_20px_50px_rgba(0,0,0,0.5)] -z-10 rounded-sm" />

                        <div className="flex flex-col gap-6 w-full text-center">
                            <div className="flex items-center justify-between opacity-20 text-[8px] font-pixel text-white tracking-[0.3em] mb-2 px-1">
                                <span>SYSTEM_PROMPT</span>
                                <span>{modalConfig.title}</span>
                            </div>

                            <p className="font-pixel text-lg md:text-xl text-white/90 leading-relaxed tracking-tight">
                                {modalConfig.message}
                            </p>
                        </div>

                        <div className="flex gap-8 items-center w-full justify-center">
                            {/* Cancel Button (Line-Art style) */}
                            <button
                                onClick={closeModal}
                                className="relative w-20 h-14 flex items-center justify-center group/btn cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95"
                            >
                                <div className="absolute inset-0 border border-white/20 group-hover/btn:border-white/40 rounded-md" />
                                <div className="absolute inset-[6px] border border-white/10 group-hover/btn:border-white/30 bg-white/[0.01] flex items-center justify-center rounded-sm">
                                    <span className="font-pixel text-xs text-white/40 group-hover/btn:text-white/70">취소</span>
                                </div>
                                {/* Depth lines */}
                                <div className="absolute top-[1px] left-[1px] w-2.5 h-[1px] bg-white/10 origin-top-left rotate-45" />
                                <div className="absolute top-[1px] right-[1px] w-2.5 h-[1px] bg-white/10 origin-top-right -rotate-45" />
                                <div className="absolute bottom-[1px] left-[1px] w-2.5 h-[1px] bg-white/10 origin-bottom-left -rotate-45" />
                                <div className="absolute bottom-[1px] right-[1px] w-2.5 h-[1px] bg-white/10 origin-bottom-right rotate-45" />
                            </button>

                            {/* Confirm Button (Line-Art style) */}
                            <button
                                onClick={() => {
                                    modalConfig.onConfirm();
                                    closeModal();
                                }}
                                className="relative w-20 h-14 flex items-center justify-center group/btn cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95"
                            >
                                <div className="absolute inset-0 border border-white/30 group-hover/btn:border-white/60 group-hover/btn:shadow-[0_0_15px_rgba(255,255,255,0.2)] rounded-md" />
                                <div className="absolute inset-[6px] border border-white/20 group-hover/btn:border-white/50 bg-white/[0.03] flex items-center justify-center rounded-sm">
                                    <span className="font-pixel text-xs text-white/80 group-hover/btn:text-white">확인</span>
                                </div>
                                {/* Depth lines */}
                                <div className="absolute top-[1px] left-[1px] w-2.5 h-[1px] bg-white/20 origin-top-left rotate-45" />
                                <div className="absolute top-[1px] right-[1px] w-2.5 h-[1px] bg-white/20 origin-top-right -rotate-45" />
                                <div className="absolute bottom-[1px] left-[1px] w-2.5 h-[1px] bg-white/20 origin-bottom-left -rotate-45" />
                                <div className="absolute bottom-[1px] right-[1px] w-2.5 h-[1px] bg-white/20 origin-bottom-right rotate-45" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Home;