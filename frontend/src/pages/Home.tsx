import { useEffect } from 'react';
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
        </div>
    );
};

export default Home;