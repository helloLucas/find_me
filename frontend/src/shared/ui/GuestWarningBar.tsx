import React, { useState } from 'react';
import { useAuthActions } from '../../features/Auth/useAuthActions';
import { AuthSelectionModal } from '../../widgets/AuthSelection';

/**
 * 4. GuestWarningBar (Shared Component)
 * - 세션이 GUEST_MODE일 때만 노출되는 노란색 경고 바
 */
export const GuestWarningBar: React.FC = () => {
    const { handleLoginWithProvider } = useAuthActions();
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    return (
        <>
            <div
                onClick={() => setIsAuthModalOpen(true)}
                className="shrink-0 border border-yellow-600/50 bg-[#1a1600]/80 backdrop-blur-md py-1.5 px-3 flex items-center gap-3 cursor-pointer hover:bg-[#251e00] transition-all rounded-sm z-50 shadow-lg group"
            >
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(234,179,8,0.5)]"></div>
                <p className="text-[9px] md:text-[15px] text-yellow-500 font-pixel tracking-tighter">
                    Change to User Mode
                </p>
                <span className="text-[9px] text-white border border-white/40 px-2 py-0.5 font-pixel group-hover:bg-white group-hover:text-black transition-colors">
                    LOGIN
                </span>
            </div>

            <AuthSelectionModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                onSelect={(provider) => {
                    setIsAuthModalOpen(false);
                    handleLoginWithProvider(provider);
                }}
            />
        </>
    );
};
