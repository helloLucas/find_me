import React from 'react';
import { createPortal } from 'react-dom';

interface AuthSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (provider: 'google' | 'ssafy') => void;
}

export const AuthSelectionModal: React.FC<AuthSelectionModalProps> = ({ isOpen, onClose, onSelect }) => {
    // 1. 모달이 닫혀있거나, Portal을 붙일 body가 아직 없으면 렌더링하지 않음 (안전장치)
    if (!isOpen || typeof document === 'undefined' || !document.body) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-[4px] animate-in fade-in duration-300">
            {/* Background click to close */}
            <div className="absolute inset-0" onClick={onClose} />

            <style>{`
                .pixel-panel {
                    position: relative;
                    background: rgba(255, 255, 255, 0.4);
                    backdrop-filter: blur(16px);

                    border-radius: 13px;

                    border: 1px solid rgba(255, 255, 255, 0.08);

                    box-shadow:
                        0 0 20px rgba(111, 163, 168, 0.25),
                        0 0 40px rgba(111, 163, 168, 0.2),
                        0 0 80px rgba(111, 163, 168, 0.15),
                        0 0 120px rgba(111, 163, 168, 0.1);
                }

                .pixel-panel::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;

                    background: radial-gradient(
                        circle,
                        rgba(255, 255, 255, 0.12),
                        transparent 70%
                    );

                    opacity: 0.25;
                    pointer-events: none;
                }
                .pixel-text-glow {
                    color: #ffffff;
                    text-shadow: 0 0 8px rgba(111, 163, 168, 0.5);
                }
                .pixel-border-glow {
                    position: relative;
                    background: rgba(42, 46, 51, 0.75);
                    border: 1px solid rgba(242, 242, 242, 0.8);

                    /* 핵심: glow */
                    box-shadow:
                        0 0 8px rgba(111, 163, 168, 0.3),
                        0 0 16px rgba(111, 163, 168, 0.2),
                        0 0 24px rgba(111, 163, 168, 0.1);

                    clip-path: polygon(
                        4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px),
                        calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px
                    );
                }
                .pixel-border-glow:hover {
                    background: rgba(255, 255, 255, 0.08);

                    box-shadow:
                        0 0 12px rgba(111, 163, 168, 0.5),
                        0 0 24px rgba(111, 163, 168, 0.4),
                        0 0 40px rgba(111, 163, 168, 0.3);

                    border-color: #F2F2F2;
                }
            `}</style>

            <div className="relative pixel-panel p-8 flex flex-col items-center gap-6 min-w-[360px] animate-in zoom-in-95 duration-200">
                <h2 className="font-pixel text-xl tracking-widest pixel-text-glow font-bold mb-2">SELECT LOGIN METHOD</h2>

                <div className="flex flex-col gap-4 w-full">
                    {/* Google Button */}
                    <button
                        onClick={() => onSelect('google')}
                        className="group flex items-center w-full px-6 py-4 pixel-border-glow transition-all active:scale-95"
                    >
                        <div className="relative mr-5 flex items-center">
                            <img
                                src="/Google_logo.png"
                                alt="Google"
                                className="w-6 h-6 object-contain"
                                style={{ imageRendering: 'auto' }}
                            />
                        </div>
                        <span className="font-pixel text-lg tracking-widest uppercase pixel-text-glow">Login with Google</span>
                    </button>

                    {/* SSAFY Button */}
                    <button
                        onClick={() => onSelect('ssafy')}
                        className="group flex items-center w-full px-6 py-4 pixel-border-glow transition-all active:scale-95"
                    >
                        <div className="mr-5 flex items-center">
                            <img
                                src="/logo_ssafy.png"
                                alt="SSAFY"
                                className="w-6 h-6 object-contain"
                                style={{ imageRendering: 'auto' }}
                            />
                        </div>
                        <span className="font-pixel text-lg tracking-widest uppercase pixel-text-glow">Login with SSAFY</span>
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="font-pixel text-xs text-[#F2F2F2]/70 hover:text-white transition-all uppercase tracking-[0.3em] mt-6 hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]"
                >
                    [ CLOSE ]
                </button>
            </div>
        </div>,
        document.body
    );
};
