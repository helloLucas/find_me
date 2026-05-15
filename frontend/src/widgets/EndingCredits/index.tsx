import { useEffect, useRef, useState, useMemo } from 'react';
import { GameLogo } from '../../shared/ui/GameLogo/GameLogo';
import './style.css';

// Persist state across remounts to prevent sequence resets
let PERSISTED_PHASE: SequencePhase | null = null;

interface EndingCreditsProps {
    onComplete: () => void;
}

type SequencePhase = 'initial' | 'credits' | 'fadeOut' | 'finalLogo' | 'glitch' | 'shutdown';

const CREDITS_DATA = {
    top: [
        { role: 'PRODUCED BY', names: 'Team B102' },
    ],
    left: [
        { role: 'DIRECTOR', names: 'Arin Kim, Woongki Min, Seohyun Park,\nDonghun Yoo, Yujin Lee, Jaeyong Lee' },
        { role: 'PLANNING & NARRATIVE DESIGN', names: 'Arin Kim, Woongki Min, Seohyun Park,\nDonghun Yoo, Yujin Lee, Jaeyong Lee' },
        { role: 'FRONTEND DEVELOPMENT', names: 'Arin Kim, Woongki Min, Seohyun Park,\nDonghun Yoo, Yujin Lee, Jaeyong Lee' },
        { role: 'SOUND & VISUAL DESIGN', names: 'Arin Kim, Woongki Min,\nSeohyun Park, Donghun Yoo,\nYujin Lee, Jaeyong Lee' },
    ],
    right: [
        { role: 'BACKEND DEVELOPMENT', names: 'Arin Kim, Woongki Min, Seohyun Park,\nDonghun Yoo, Yujin Lee, Jaeyong Lee' },
        { role: 'INFRASTRUCTURE & DEVOPS', names: 'Arin Kim, Woongki Min, Seohyun Park,\nDonghun Yoo, Yujin Lee, Jaeyong Lee' },
        { role: 'VIDEO & MOTION GRAPHICS', names: 'Arin Kim, Woongki Min, Seohyun Park,\nDonghun Yoo, Yujin Lee, Jaeyong Lee' },
        { role: 'SPECIAL THANKS', names: 'SSAFY, All Play Testers,\nAnd You' }
    ]
};

export const EndingCredits: React.FC<EndingCreditsProps> = ({ onComplete }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [phase, setPhase] = useState<SequencePhase>(PERSISTED_PHASE || 'initial');

    // Persist phase changes
    useEffect(() => {
        PERSISTED_PHASE = phase;
    }, [phase]);

    // Generate random delays for items once
    const entryDelays = useMemo(() => ({
        top: CREDITS_DATA.top.map(() => Math.random() * 2.5),
        left: CREDITS_DATA.left.map(() => Math.random() * 4),
        right: CREDITS_DATA.right.map(() => Math.random() * 4),
    }), []);

    const exitDelays = useMemo(() => ({
        top: CREDITS_DATA.top.map(() => 2.0 + Math.random() * 0.5), // 2.0s - 2.5s
        left: CREDITS_DATA.left.map(() => Math.random() * 1.2),     // < 1.2s
        right: CREDITS_DATA.right.map(() => Math.random() * 1.2),   // < 1.2s
    }), []);

    const onCompleteRef = useRef(onComplete);
    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

    const startFinale = () => {
        if (phase !== 'credits' && phase !== 'initial') return;
        setPhase('fadeOut');
    };

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => {});
        }

        // Move from initial to credits to trigger fade-ins
        if (phase === 'initial') {
            const t = setTimeout(() => setPhase('credits'), 100);
            return () => clearTimeout(t);
        }

        const entryFinishedTimer = setTimeout(startFinale, 12000); 

        return () => clearTimeout(entryFinishedTimer);
    }, [phase]);

    useEffect(() => {
        if (phase === 'fadeOut') {
            const t = setTimeout(() => setPhase('finalLogo'), 1500);
            return () => clearTimeout(t);
        }
        if (phase === 'finalLogo') {
            const t = setTimeout(() => setPhase('glitch'), 4500);
            return () => clearTimeout(t);
        }
        if (phase === 'glitch') {
            const t = setTimeout(() => setPhase('shutdown'), 800);
            return () => clearTimeout(t);
        }
        if (phase === 'shutdown') {
            const t = setTimeout(() => {
                PERSISTED_PHASE = null;
                onCompleteRef.current();
            }, 700);
            return () => clearTimeout(t);
        }
    }, [phase]);

    return (
        <div className={`ending-credits-overlay phase-${phase}`}>
            <video
                ref={videoRef}
                className="credits-video-bg"
                autoPlay
                muted
                playsInline
                crossOrigin="anonymous"
                poster="/void_city_ending_bg.png"
                src="https://djbod0nv85jx9.cloudfront.net/videos/ending/ending_credits.mp4"
                onEnded={startFinale}
            />

            <div className="credits-vignette" />
            <div className="glitch-overlay" />

            <div className="credits-arc-wrapper">
                <header className="credits-header-fixed">
                    {/* Home Style Logo */}
                    <GameLogo 
                        className="credits-logo-group" 
                        primarySizeClass="logo-primary" 
                        secondarySizeClass="logo-secondary" 
                        secondaryMarginClass="-mt-2"
                    />
                    
                    <div className="header-credits" style={{ 
                        opacity: (phase === 'credits' || phase === 'fadeOut') ? 1 : 0,
                        transition: 'opacity 1.2s ease',
                        transitionDelay: phase === 'credits' ? `${entryDelays.top[0]}s` : `${exitDelays.top[0]}s`
                    } as React.CSSProperties}>
                        <div className="credit-role">{CREDITS_DATA.top[0].role}</div>
                        <div className="credit-names">{CREDITS_DATA.top[0].names}</div>
                    </div>
                </header>

                <div className="credits-left" style={{ opacity: phase === 'initial' ? 0 : 1 }}>
                    {CREDITS_DATA.left.map((item, i) => {
                        const angle = -15 - (i * 8) - (i > 0 ? 2 : 0);
                        return (
                            <div key={i} className="credit-block-orbit" style={{ 
                                '--angle': `${angle}deg`, 
                                opacity: phase === 'credits' ? 1 : 0,
                                transitionDelay: phase === 'credits' ? `${entryDelays.left[i]}s` : `${exitDelays.left[i]}s`
                            } as React.CSSProperties}>
                                <div className="credit-role">{item.role}</div>
                                <div className="credit-names">{item.names}</div>
                            </div>
                        );
                    })}
                </div>

                <div className="credits-right" style={{ opacity: phase === 'initial' ? 0 : 1 }}>
                    {CREDITS_DATA.right.map((item, i) => {
                        const angle = 15 + (i * 8) + (i > 0 ? 2 : 0);
                        return (
                            <div key={i} className="credit-block-orbit" style={{ 
                                '--angle': `${angle}deg`, 
                                opacity: phase === 'credits' ? 1 : 0,
                                transitionDelay: phase === 'credits' ? `${entryDelays.right[i]}s` : `${exitDelays.right[i]}s`
                            } as React.CSSProperties}>
                                <div className="credit-role">{item.role}</div>
                                <div className="credit-names">{item.names}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <button className="credits-skip-btn" onClick={(e) => {
                e.stopPropagation();
                onComplete();
            }}>
                SKIP SESSION [SPACE]
            </button>
        </div>
    );
};
