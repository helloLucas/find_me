import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MinigameCard } from './ui/MinigameCard';
import { trackAnalyticsEvent } from '../../shared/analytics';

const MinigameSelectionPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const minigames = [
        {
            id: 'pacman',
            title: 'PACMAN: NEO',
            chapter: 1,
            description: 'EAT BONES, AVOID HUMANS',
            status: 'available' as const,
            path: '/minigames/pacman',
            backgroundImage: '/pacman/dog.png'
        },
        {
            id: 'starforce',
            title: 'CORE TIMING',
            chapter: 2,
            description: 'PERFECT SYNCHRONIZATION',
            status: 'available' as const,
            path: '/minigames/starforce',
            backgroundImage: '/starforce_bg.png'
        },
        {
            id: 'packet-dash',
            title: 'CYBER PACKET DASH',
            chapter: 3,
            description: 'HIGH-SPEED DATA TRANSMISSION',
            status: 'available' as const,
            path: '/minigames/packet-dash',
            backgroundImage: '/packet_dash_bg.png'
        },
        {
            id: 'lucas-survival',
            title: 'LUCAS SURVIVAL',
            chapter: 4,
            description: 'SURVIVE THE CYBER SWARM',
            status: 'available' as const,
            path: '/minigames/lucas-survival',
            backgroundImage: '/lucas_survival_bg.png'
        },
        {
            id: 'lucas-route',
            title: 'LUCAS ROUTE',
            chapter: 4,
            description: 'NAVIGATE THE OPTIMAL PATH',
            status: 'available' as const,
            path: '/minigames/lucas-route',
            backgroundImage: '/lucas_route_bg.png'
        }
    ];

    const handleBack = () => {
        navigate('/');
    };

    return (
        <div className="select-none h-screen w-screen overflow-hidden flex flex-col relative p-4 md:p-8 bg-darkbg text-white font-lobby">
            {/* Header */}
            <header className="shrink-0 flex justify-between items-center w-full max-w-5xl mx-auto tracking-widest border-b border-gray-800 pb-3 mb-4 transition-opacity duration-300">
                <div className="flex gap-6 items-center">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-sm md:text-lg font-bold text-gray-300 hover:text-[#a3e635] transition-all group"
                    >
                        <span className="text-gray-500 group-hover:text-[#a3e635]">{" < "}</span>
                        <span className="border-b border-transparent group-hover:border-[#a3e635]">{t('setup.back')}</span>
                    </button>
                    <div className="flex flex-col gap-0.5 border-l border-gray-800 pl-6 opacity-30 select-none">
                        <div className="flex items-center gap-2 text-[8px] uppercase tracking-tighter">
                            <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-pulse"></span>
                            <span>ARCADE_MODE_ACTIVE</span>
                        </div>
                        <div className="text-[10px] text-gray-500">MINIGAMES_V.01</div>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center w-full max-w-4xl mx-auto min-h-0 relative">
                <h1 className="shrink-0 text-3xl md:text-4xl tracking-[0.3em] mt-4 mb-4 text-white font-bold drop-shadow-lg uppercase text-center">
                    Arcade Cabinet
                </h1>
                <p className="text-gray-500 text-[10px] mb-8 tracking-[0.2em] uppercase">
                    Practice mode: No fragment synchronization enabled
                </p>

                <div className="w-full flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto custom-scrollbar pb-6">
                    {minigames.map((mg) => (
                        <MinigameCard
                            key={mg.id}
                            id={mg.id}
                            title={mg.title}
                            chapter={mg.chapter}
                            description={mg.description}
                            status={mg.status}
                            backgroundImage={mg.backgroundImage}
                            icon={null}
                            onClick={() => {
                                trackAnalyticsEvent('minigame_arcade_clicked', { minigame_id: mg.id });
                                navigate(mg.path);
                            }}
                        />
                    ))}
                </div>
            </main>

            <footer className="shrink-0 w-full max-w-4xl mx-auto mt-4 text-center text-[9px] text-gray-700 tracking-[0.4em] border-t border-gray-900 pt-4 pb-2 uppercase">
                NEURAL-ARCADE INTERFACE // FUN_MODE_ONLY
            </footer>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 2px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #374151; }
            `}</style>
        </div>
    );
};

export default MinigameSelectionPage;
