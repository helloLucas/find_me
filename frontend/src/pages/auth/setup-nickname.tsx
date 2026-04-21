import { useState } from 'react';
import { useUpdateNickname } from '../../features/User/useUpdateNickname';

/**
 * SetupNicknamePage
 * 
 * 신규 가입 유저가 OAuth 로그인 직후 서비스에서 사용할 초기 닉네임을 설정하는 전용 UI 페이지입니다.
 * 사이버펑크 터미널 감성의 어두운 테마와 강렬한 형광 녹색 포인트를 특징으로 합니다.
 */
const SetupNicknamePage = () => {
    const [nickname, setNickname] = useState('');
    const { mutate, isPending } = useUpdateNickname();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nickname.trim() || isPending) return;

        // Step 3에서 만든 훅을 호출하여 닉네임 수정 수행
        mutate({ nickname });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] bg-[#0a0c08] text-[#a3e635] font-pixel p-4 md:p-8">
            <div className="w-full max-w-xl border-2 border-[#a3e635]/30 p-8 md:p-12 glass relative overflow-hidden shadow-[0_0_30px_rgba(163,230,53,0.05)]">

                {/* 배경 데코레이션 (Grid 등) */}
                <div className="absolute top-0 right-0 p-2 text-[8px] opacity-20 select-none">
                    SECURE_MODE: ON
                </div>

                {/* 헤더 섹션 */}
                <header className="mb-14 border-b border-[#a3e635]/20 pb-8">
                    <h1 className="text-xl md:text-3xl mb-6 tracking-[0.2em] animate-pulse leading-tight">
                        INITIALIZING <br className="md:hidden" /> NEW AGENT...
                    </h1>
                    <div className="flex flex-col gap-2 text-[10px] md:text-xs opacity-60 uppercase tracking-tighter font-mono">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-[#a3e635] animate-ping"></span>
                            <span>STATUS: CONNECTION_STABLE</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[#ff0055]">[!]</span>
                            <span>ACTION: IDENTITY_SETUP_REQUIRED</span>
                        </div>
                    </div>
                </header>

                {/* 닉네임 입력 폼 */}
                <form onSubmit={handleSubmit} className="space-y-12">
                    <div className="relative group">
                        <label
                            htmlFor="nickname"
                            className="block text-xs md:text-sm mb-4 opacity-80 tracking-[0.15em] flex items-center gap-3"
                        >
                            <span className="text-[#ff0055]">{">>>"}</span>
                            CHOOSE YOUR DESIGNATION
                        </label>

                        <div className="relative">
                            <input
                                id="nickname"
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                placeholder="AGENT_NAME_O0"
                                required
                                maxLength={15}
                                disabled={isPending}
                                autoComplete="off"
                                className="w-full bg-[#0a0c08]/50 border-2 border-[#a3e635]/40 p-5 focus:outline-none focus:border-[#a3e635] focus:ring-1 focus:ring-[#a3e635]/50 text-xl uppercase tracking-[0.25em] placeholder:text-[#a3e635]/20 transition-all duration-300"
                            />
                            {/* 커서 점멸 효과 */}
                            <div className="absolute top-0 right-5 h-full flex items-center pointer-events-none">
                                <span className="text-2xl animate-blink">_</span>
                            </div>
                        </div>

                        <p className="mt-3 text-[10px] opacity-40 text-right uppercase tracking-widest">
                            {nickname.length} / 15 chars
                        </p>
                    </div>

                    {/* 제출 버튼 */}
                    <button
                        type="submit"
                        disabled={isPending || !nickname.trim()}
                        className="w-full group relative overflow-hidden active:scale-95 transition-transform"
                    >
                        <div className="absolute inset-0 border-2 border-[#a3e635] group-hover:bg-[#a3e635]/10 transform transition-colors duration-200"></div>
                        <div className="relative px-8 py-5 flex items-center justify-center gap-4 text-[#a3e635] group-hover:text-[#0a0c08] transition-colors duration-200">
                            {/* 버튼 배경 채우기 애니메이션 */}
                            <div className="absolute inset-0 bg-[#a3e635] transform translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out"></div>

                            <span className="relative z-10 font-bold tracking-[0.4em] text-sm md:text-base">
                                {isPending ? 'STABILIZING...' : 'ASSERT IDENTITY'}
                            </span>
                            {!isPending && (
                                <span className="relative z-10 text-xl font-bold translate-y-[-1px]">↵</span>
                            )}
                        </div>
                    </button>
                </form>

                {/* 시스템 푸터 */}
                <footer className="mt-16 flex justify-between items-end opacity-30 text-[8px] md:text-[10px] uppercase font-mono tracking-widest border-t border-[#a3e635]/10 pt-6">
                    <div className="space-y-1">
                        <div>System Host: ANTI_GRAV_OS</div>
                        <div>Enc-Link: ACTIVE</div>
                    </div>
                    <div className="text-right">
                        <div>Session Token: VALID</div>
                        <div>Dist: Sector-07</div>
                    </div>
                </footer>
            </div>

            {/* 인라인 스타일: 로컬 애니메이션 정의 */}
            <style>{`
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                .animate-blink {
                    animation: blink 0.8s step-end infinite;
                }
            `}</style>
        </div>
    );
};

export default SetupNicknamePage;
