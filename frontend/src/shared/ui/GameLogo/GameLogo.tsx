import React from 'react';
import './GameLogo.css';

interface GameLogoProps {
    className?: string;
    primarySizeClass?: string;
    secondarySizeClass?: string;
    secondaryMarginClass?: string;
}

export const GameLogo: React.FC<GameLogoProps> = ({ 
    className = "", 
    primarySizeClass = "text-7xl md:text-8xl", 
    secondarySizeClass = "text-4xl md:text-5xl",
    secondaryMarginClass = "-mt-6"
}) => {
    const titlePrimary = "FIND ME";
    const titleSecondary = ": VOID CITY";

    return (
        <header className={`glitch-group ${className} select-none`}>
            <h1
                className={`glitch-text-pro font-landing-title tracking-tighter ${primarySizeClass}`}
                data-text={titlePrimary}
            >
                {titlePrimary}
            </h1>
            <h2
                className={`glitch-text-pro font-landing-title tracking-widest self-end ${secondaryMarginClass} mr-4 opacity-80 ${secondarySizeClass}`}
                data-text={titleSecondary}
            >
                {titleSecondary}
            </h2>
            <div className="pixel-slice" data-text={titlePrimary}></div>
        </header>
    );
};
