import { useEffect, useState } from 'react';

const FullscreenEnforcer = () => {
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

    if (isFullscreen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#05080a]/70 backdrop-blur-[24px] transition-all duration-1000 select-none">
            <div 
                onClick={toggleFullscreen}
                className="hud-fade-in relative text-center p-16 max-w-xl w-full mx-6 flex flex-col items-center gap-14 cursor-pointer group/window bg-white/[0.01] border border-white/5"
            >
                {/* Advanced Glass Container Decoration */}
                <div className="absolute inset-0 border border-white/10 bg-white/[0.02] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] -z-10 rounded-[2px]" />
                
                {/* Light Reflection (Specular) */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent -z-10 rounded-[2px]" />
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent -z-10" />
                
                {/* HUD Corner Brackets */}
                <div className="absolute top-[-4px] left-[-4px] w-5 h-5 border-t border-l border-white/40" />
                <div className="absolute top-[-4px] right-[-4px] w-5 h-5 border-t border-r border-white/40" />
                <div className="absolute bottom-[-4px] left-[-4px] w-5 h-5 border-b border-l border-white/40" />
                <div className="absolute bottom-[-4px] right-[-4px] w-5 h-5 border-b border-r border-white/40" />

                <div className="flex flex-col gap-12 w-full">
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
                                    {/* Subtle internal shimmer animation */}
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
    );
};

export default FullscreenEnforcer;
