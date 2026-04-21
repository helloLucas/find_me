import { useEffect, useState } from 'react';
import { useAuthStore } from '../app/store/authStore';
import { useAuthActions } from '../features/Auth/useAuthActions';
import MainMenu from '../widgets/MainMenu/MainMenu';

const Home = () => {
    const checkAuth = useAuthStore((state) => state.checkAuth);
    const { handleSystemAccess, handleGuestAccess, handleLogout } = useAuthActions();

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

    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        }
    };

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
                .hud-fade-in {
                    animation: fadeInScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes fadeInScale {
                    0% { opacity: 0; transform: scale(0.98); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
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
                    onGuestClick={handleGuestAccess}
                    onLogoutClick={handleLogout}
                />
            </div>

            <div className="absolute bottom-10 left-16 md:left-24 opacity-30">
                <p className="font-pixel text-[9px] text-gray-700 uppercase tracking-[0.4em]">
                    Connection: Secure // Protocol: Lucas_v3
                </p>
            </div>

            {!isFullscreen && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#05080a]/70 backdrop-blur-[24px] transition-all duration-1000">
                    <div 
                        onClick={toggleFullscreen}
                        className="hud-fade-in relative text-center p-16 max-w-xl w-full mx-6 flex flex-col items-center gap-14 cursor-pointer group/window"
                    >
                        {/* Advanced Glass Container */}
                        <div className="absolute inset-0 border border-white/10 bg-white/[0.02] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] -z-10 rounded-[2px] transition-all duration-500 group-hover/window:bg-white/[0.04] group-hover/window:border-white/20" />
                        
                        {/* Light Reflection (Specular) */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent -z-10 rounded-[2px]" />
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent -z-10" />
                        
                        <div className="corner-bracket corner-tl !border-white/20 group-hover/window:!border-white/40 transition-colors duration-500" />
                        <div className="corner-bracket corner-tr !border-white/20 group-hover/window:!border-white/40 transition-colors duration-500" />
                        <div className="corner-bracket corner-bl !border-white/20 group-hover/window:!border-white/40 transition-colors duration-500" />
                        <div className="corner-bracket corner-br !border-white/20 group-hover/window:!border-white/40 transition-colors duration-500" />

                        <div className="flex flex-col gap-12 w-full pointer-events-none">
                            <div className="flex items-center justify-between opacity-10 text-[9px] font-pixel text-white tracking-[0.3em] px-1">
                                <span>SECURE_ACCESS_PROTOCOL</span>
                                <span>v3.0.42</span>
                            </div>

                            <div className="flex flex-col gap-10">
                                <p className="font-pixel text-[22px] md:text-[28px] text-white tracking-tight leading-relaxed text-center drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover/window:text-white transition-all duration-500">
                                    시각적 몰입을 위해<br />
                                    전체 화면으로 전환해주세요.
                                </p>
                                
                                {/* Line-Art 3D Key Icon (Pop-out effect) */}
                                <div className="flex flex-col items-center gap-6 mt-6">
                                    <div className="relative w-24 h-20 flex items-center justify-center group/key transition-all duration-500 hover:scale-110 active:scale-95 group-hover/window:scale-[1.02]">
                                        {/* Outer Frame (Glows and pops on hover) */}
                                        <div className="absolute inset-0 border-2 border-white/20 group-hover/window:border-white/40 group-hover/key:border-white/60 group-hover/key:shadow-[0_20px_50px_rgba(255,255,255,0.25)] rounded-lg transition-all duration-500" />
                                        
                                        {/* Inner Surface (Pops out on hover) */}
                                        <div className="absolute inset-[10px] border-2 border-white/20 group-hover/window:border-white/30 group-hover/key:border-white/50 bg-white/[0.02] group-hover/key:bg-white/[0.08] flex items-center justify-center overflow-hidden rounded-md transition-all duration-500 group-hover/key:-translate-y-2 group-hover/key:translate-x-1">
                                            <span className="font-pixel text-2xl text-white/50 group-hover/window:text-white/80 group-hover/key:text-white transition-colors duration-500 drop-shadow-[0_0_15px_rgba(255,255,255,0)] group-hover/key:drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">F11</span>
                                            {/* Subtle internal shimmer */}
                                            <div className="absolute -inset-x-full top-0 h-full w-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent animate-[shimmer_3s_infinite]" />
                                        </div>
                                        
                                        {/* Diagonal Corner Lines (Extends on hover) */}
                                        <div className="absolute top-[2px] left-[2px] w-[14px] h-[2px] bg-white/10 group-hover/window:bg-white/30 group-hover/key:bg-white/60 group-hover/key:w-[18px] origin-top-left rotate-45 transition-all duration-500" />
                                        <div className="absolute top-[2px] right-[2px] w-[14px] h-[2px] bg-white/10 group-hover/window:bg-white/30 group-hover/key:bg-white/60 group-hover/key:w-[18px] origin-top-right -rotate-45 transition-all duration-500" />
                                        <div className="absolute bottom-[2px] left-[2px] w-[14px] h-[2px] bg-white/10 group-hover/window:bg-white/30 group-hover/key:bg-white/60 group-hover/key:w-[18px] origin-bottom-left -rotate-45 transition-all duration-500" />
                                        <div className="absolute bottom-[2px] right-[2px] w-[14px] h-[2px] bg-white/10 group-hover/window:bg-white/30 group-hover/key:bg-white/60 group-hover/key:w-[18px] origin-bottom-right rotate-45 transition-all duration-500" />
                                    </div>
                                    <span className="font-pixel text-[11px] text-white/20 group-hover/window:text-white/40 tracking-[0.6em] uppercase transition-all duration-500">
                                        Click to Engage
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;