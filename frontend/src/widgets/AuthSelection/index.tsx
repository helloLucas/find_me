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
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        </div>
                        <span className="font-pixel text-lg tracking-widest uppercase pixel-text-glow">Login with Google</span>
                    </button>

                    {/* SSAFY Button */}
                    <button
                        onClick={() => onSelect('ssafy')}
                        className="group flex items-center w-full px-6 py-4 pixel-border-glow transition-all active:scale-95"
                    >
                        <div className="mr-5 flex flex-col items-center">
                            <svg width="24" height="20" viewBox="0 0 512 435" fill="white">
                                <path d="M256 0L0 128V307L256 435L512 307V128L256 0ZM448 271L256 367L64 271V164L256 260L448 164V271Z" />
                                <path d="M256 64L128 128V192L256 256L384 192V128L256 64Z" />
                            </svg>
                            <span className="text-[6px] font-pixel tracking-tighter mt-1 font-bold">SSAFY</span>
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
