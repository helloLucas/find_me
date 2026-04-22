import React from 'react';
import { useAuthActions } from '../../features/Auth/useAuthActions';

/**
 * 4. GuestWarningBar (Shared Component)
 * - 세션이 GUEST_MODE일 때만 노출되는 노란색 경고 바
 */
export const GuestWarningBar: React.FC = () => {
    const { handleSystemAccess } = useAuthActions();

    return (
        <div 
            onClick={handleSystemAccess}
            className="shrink-0 w-full max-w-4xl mx-auto border border-yellow-600 bg-[#1a1600] p-4 flex flex-col md:flex-row items-center justify-center gap-4 cursor-pointer hover:bg-[#251e00] transition-colors rounded-sm z-50 mb-4"
        >
            <p className="text-[10px] md:text-xs text-yellow-500 font-pixel tracking-tighter">
                <span className="font-bold mr-2">[!] SYSTEM_WARNING:</span>
                게스트 세션은 저장이 불가능합니다.
            </p>
            <span className="text-[10px] md:text-xs text-white border border-white px-3 py-1 font-pixel hover:bg-white hover:text-black transition-colors">
                LOGIN_REQUIRED
            </span>
        </div>
    );
};
