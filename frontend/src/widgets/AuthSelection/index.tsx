import React from 'react';
import { createPortal } from 'react-dom';

interface AuthSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (provider: 'google' | 'ssafy') => void;
}

type AuthProvider = 'google' | 'ssafy';

const AUTH_PROVIDERS: Array<{
    id: AuthProvider;
    label: string;
    channel: string;
    description: string;
    logoSrc: string;
    logoAlt: string;
    logoClassName: string;
}> = [
    {
        id: 'google',
        label: 'Login with Google',
        channel: 'OAuth // Google',
        description: 'External identity provider',
        logoSrc: '/Google_logo.png',
        logoAlt: 'Google',
        logoClassName: 'w-7 h-7 object-contain',
    },
    {
        id: 'ssafy',
        label: 'Login with SSAFY',
        channel: 'Campus // SSAFY',
        description: 'Institution account channel',
        logoSrc: '/logo_ssafy.png',
        logoAlt: 'SSAFY',
        logoClassName: 'w-8 h-6 object-contain',
    },
];

export const AuthSelectionModal: React.FC<AuthSelectionModalProps> = ({
    isOpen,
    onClose,
    onSelect,
}) => {
    if (!isOpen || typeof document === 'undefined' || !document.body) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose} />

            <div className="hud-fade-in relative max-w-md w-full mx-6 p-8 flex flex-col gap-6">
                <div className="absolute inset-0 border border-white/10 bg-black/58 shadow-[0_20px_60px_rgba(0,0,0,0.55),0_0_24px_rgba(111,163,168,0.12)] rounded-sm -z-10" />
                <div className="absolute inset-[10px] border border-cyan-200/10 rounded-[2px] pointer-events-none" />
                <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-cyan-200/30 pointer-events-none" />
                <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-cyan-200/30 pointer-events-none" />
                <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-cyan-200/30 pointer-events-none" />
                <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-cyan-200/30 pointer-events-none" />

                <div className="flex items-center justify-between opacity-50 text-[9px] font-auth-flow text-white tracking-[0.3em] uppercase">
                    <span>System Access</span>
                    <span>Auth Gateway</span>
                </div>

                <div className="flex flex-col gap-2 text-center">
                    <p className="font-auth-flow text-[10px] uppercase tracking-[0.45em] text-cyan-200/70">
                        Select Login Method
                    </p>
                    <h2 className="font-auth-flow text-xl text-white tracking-widest drop-shadow-[0_0_10px_rgba(255,255,255,0.15)]">
                        Choose Access Channel
                    </h2>
                    <p className="font-auth-flow text-[10px] text-white/45 tracking-[0.18em] uppercase">
                        Connect through an approved identity source
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    {AUTH_PROVIDERS.map((provider) => (
                        <button
                            key={provider.id}
                            onClick={() => onSelect(provider.id)}
                            className="group relative flex items-center gap-4 w-full px-4 py-4 text-left border border-white/15 bg-white/[0.03] hover:bg-white/[0.06] hover:border-cyan-300/45 active:scale-[0.99] transition-all duration-200 rounded-[2px]"
                        >
                            <div className="absolute inset-[5px] border border-white/6 group-hover:border-cyan-200/20 rounded-[1px] pointer-events-none" />

                            <div className="relative z-10 w-12 h-12 shrink-0 border border-white/15 bg-black/22 flex items-center justify-center shadow-[inset_0_0_12px_rgba(255,255,255,0.03)]">
                                <img
                                    src={provider.logoSrc}
                                    alt={provider.logoAlt}
                                    className={provider.logoClassName}
                                    style={{ imageRendering: 'auto' }}
                                />
                            </div>

                            <div className="relative z-10 flex-1 min-w-0">
                                <p className="font-auth-flow text-[9px] uppercase tracking-[0.32em] text-cyan-200/65 mb-1">
                                    {provider.channel}
                                </p>
                                <p className="font-auth-flow text-sm text-white tracking-[0.12em] uppercase">
                                    {provider.label}
                                </p>
                                <p className="font-auth-flow text-[9px] text-white/45 tracking-[0.12em] uppercase mt-1">
                                    {provider.description}
                                </p>
                            </div>

                            <div className="relative z-10 font-auth-flow text-xs text-white/35 group-hover:text-cyan-200/80 tracking-[0.3em] uppercase">
                                Enter
                            </div>
                        </button>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="self-center font-auth-flow text-[10px] text-white/55 hover:text-white transition-all uppercase tracking-[0.35em] mt-2"
                >
                    [ Close ]
                </button>
            </div>
        </div>,
        document.body
    );
};
