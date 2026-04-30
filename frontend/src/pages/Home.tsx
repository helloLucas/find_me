import { useEffect, useState } from 'react';
import { useAuthStore } from '../app/store/authStore';
import { useAuthActions } from '../features/Auth/useAuthActions';
import MainMenu from '../widgets/MainMenu/MainMenu';
import { useModalStore } from '../app/store/modalStore';
import { AuthSelectionModal } from '../widgets/AuthSelection';

const Home = () => {
    const checkAuth = useAuthStore((state) => state.checkAuth);
    const { handleLoginWithProvider, handleGuestAccess, handleLogout } = useAuthActions();

    const openModal = useModalStore((state) => state.openModal);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    const handleLoginClick = () => {
        setIsAuthModalOpen(true);
    };

    const handleSelectProvider = (provider: 'google' | 'ssafy') => {
        setIsAuthModalOpen(false);
        handleLoginWithProvider(provider);
    };

    const handleGuestClick = () => {
        openModal({
            title: 'ANONYMOUS_ACCESS_WARNING',
            message: '익명 접속 시 진행 상황이 저장되지 않을 수 있습니다.\n계속하시겠습니까?',
            type: 'confirm',
            onConfirm: handleGuestAccess
        });
    };

    const handleLogoutClick = () => {
        openModal({
            title: 'LOGOUT_CONFIRMATION',
            message: '로그아웃 하시겠습니까?\n세션이 종료됩니다.',
            type: 'confirm',
            onConfirm: handleLogout
        });
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

    const backgroundImageUrl = '/lucas_landing_user_bg.jpg';

    return (
        <div
            className="min-h-screen w-full relative overflow-hidden bg-[#0a1118] flex flex-col justify-center select-none pixel-crisp"
            style={{
                backgroundImage: `linear-gradient(to right, #000 0%, #000 30%, rgba(0, 0, 0, 0.1) 70%, rgba(0, 0, 0, 0.4) 100%), url(${backgroundImageUrl})`,
                backgroundSize: 'contain',
                backgroundPosition: 'right center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: '#000'
            }}
        >
            <style>{`
                .pixel-crisp {
                    -webkit-font-smoothing: none;
                    -moz-osx-font-smoothing: grayscale;
                    image-rendering: crisp-edges;
                    image-rendering: pixelated;
                }
                .glitch-group {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.15));
                }
                .glitch-text-pro {
                    position: relative;
                    color: white;
                    line-height: 0.9;
                }
                /* Higher intensity glitch with color bursts */
                .glitch-text-pro::before,
                .glitch-text-pro::after {
                    content: attr(data-text);
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: transparent;
                    opacity: 0.8;
                }
                .glitch-text-pro::before {
                    animation: glitch-pixel-1 3s infinite linear alternate-reverse;
                    text-shadow: -2px 0 #00ffff;
                    clip-path: inset(45% 0 44% 0);
                    opacity: 0; /* invisible until glitch */
                }
                .glitch-text-pro::after {
                    animation: glitch-pixel-2 2.5s infinite linear alternate-reverse;
                    text-shadow: 2px 0 #ff00ff;
                    clip-path: inset(80% 0 5% 0);
                    opacity: 0; /* invisible until glitch */
                }
                
                @keyframes glitch-pixel-1 {
                    0%, 100% { opacity: 0; clip-path: inset(0 0 0 0); transform: translate(0); }
                    20%, 25% { opacity: 1; clip-path: inset(10% 0 85% 0); transform: translate(-8px, -2px); }
                    26%, 30% { opacity: 0.4; clip-path: inset(44% 0 43% 0); transform: translate(12px, 2px); }
                    31%, 35% { opacity: 0; }
                }
                @keyframes glitch-pixel-2 {
                    0%, 70% { opacity: 0; clip-path: inset(80% 0 5% 0); transform: translate(0); }
                    71%, 75% { opacity: 1; clip-path: inset(44% 0 43% 0); transform: translate(8px, 1px); }
                    76%, 80% { opacity: 0.4; clip-path: inset(10% 0 85% 0); transform: translate(-12px, -1px); }
                    81%, 100% { opacity: 0; }
                }

                /* Slicing Effect */
                .pixel-slice {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: transparent;
                    pointer-events: none;
                    animation: pixel-slice-anim 5s infinite step-end;
                }
                @keyframes pixel-slice-anim {
                    0%, 90% { clip-path: inset(0 0 100% 0); }
                    91% { clip-path: inset(20% 0 78% 0); transform: translateX(-10px); }
                    92% { clip-path: inset(50% 0 48% 0); transform: translateX(10px); }
                    93% { clip-path: inset(80% 0 18% 0); transform: translateX(-5px); }
                    94%, 100% { clip-path: inset(0 0 100% 0); }
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

            <div className="absolute top-32 left-16 md:top-40 md:left-24 flex flex-col">
                <header className="flex flex-col mb-20 select-none glitch-group">
                    <h1 
                        className="glitch-text-pro font-landing-title text-7xl md:text-8xl tracking-tighter"
                        data-text="FIND ME"
                    >
                        FIND ME
                    </h1>
                    <h2 
                        className="glitch-text-pro font-landing-title text-4xl md:text-5xl tracking-widest self-end -mt-6 mr-4 opacity-80"
                        data-text=": VOID CITY"
                    >
                        : VOID CITY
                    </h2>
                    <div className="pixel-slice" data-text="FIND ME"></div>
                </header>

                <MainMenu
                    onLoginClick={handleLoginClick}
                    onGuestClick={handleGuestClick}
                    onLogoutClick={handleLogoutClick}
                />
            </div>

            <div className="absolute bottom-10 left-16 md:left-24 opacity-30">
                <p className="font-app-text text-[9px] text-white/40 uppercase tracking-[0.4em] flex items-center gap-3">
                    <span className="w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-pulse"></span>
                    Connection: Secure // Protocol: Lucas_v3
                </p>
            </div>

            <AuthSelectionModal 
                isOpen={isAuthModalOpen} 
                onClose={() => setIsAuthModalOpen(false)} 
                onSelect={handleSelectProvider}
            />
        </div>
    );
};

export default Home;
