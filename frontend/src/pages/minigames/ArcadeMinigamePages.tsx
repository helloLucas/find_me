import { useNavigate } from "react-router-dom";
import { PacmanTab } from "../../features/Browser/components/PacmanTab";
import { StarforceTab } from "../../features/Browser/components/StarforceTab";
import { CyberPacketDashTab } from "../../features/Browser/components/CyberPacketDashTab";
import { LucasRouteGame } from "../../features/minigames/lucas-route";
import { LucasSurvivalApp } from "../../minigames/lucas-survival/LucasSurvivalApp";
import "../../minigames/lucas-survival/styles.css";

const ArcadeBackButton = () => {
    const navigate = useNavigate();
    return (
        <button 
            onClick={() => navigate('/minigames')}
            className="fixed top-6 left-6 z-[9999] px-4 py-2 bg-black/60 border border-white/20 text-white/60 font-lobby text-xs tracking-widest hover:bg-[#a3e635] hover:text-black hover:border-[#a3e635] transition-all flex items-center gap-2 group"
        >
            <span className="group-hover:-translate-x-1 transition-transform">{" < "}</span>
            BACK TO ARCADE
        </button>
    );
};

export const PacmanArcadePage = () => {
    return (
        <div className="w-screen h-screen bg-black relative">
            <ArcadeBackButton />
            <PacmanTab isPractice={true} />
        </div>
    );
};

export const StarforceArcadePage = () => {
    return (
        <div className="w-screen h-screen bg-black relative">
            <ArcadeBackButton />
            <StarforceTab isPractice={true} />
        </div>
    );
};

export const PacketDashArcadePage = () => {
    return (
        <div className="w-screen h-screen bg-black relative">
            <ArcadeBackButton />
            <CyberPacketDashTab isPractice={true} />
        </div>
    );
};

export const LucasSurvivalArcadePage = () => {
    return (
        <div className="w-screen h-screen bg-black relative">
            <ArcadeBackButton />
            <LucasSurvivalApp isPractice={true} />
        </div>
    );
};

export const LucasRouteArcadePage = () => {
    return (
        <div className="w-screen h-screen bg-black relative">
            <ArcadeBackButton />
            <LucasRouteGame isPractice={true} />
        </div>
    );
};
