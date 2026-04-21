import { useState } from 'react';
import { useUpdateNickname } from '../../features/User/useUpdateNickname';

/**
 * SetupNicknamePage
 */
const SetupNicknamePage = () => {
    const [nickname, setNickname] = useState('');
    const { mutate, isPending } = useUpdateNickname();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nickname.trim() || isPending) return;
        mutate({ nickname });
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-[#05000a] overflow-hidden font-pixel text-purple-300">

            <div className="absolute inset-0 opacity-10 pointer-events-none"
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.828-1.415 1.415L51.8 0h2.827zM5.373 0l-.83.828L5.96 2.243 8.2 0H5.374zM48 0l3 3 3-3h-6zm-36 0l-3 3-3-3h6zM30 0l3 3 3-3h-6zM0 30l3 3 3-3H0zm0 18l3 3 3-3H0zM0 12l3 3 3-3H0zm0-6l3 3 3-3H0zm0 36l3 3 3-3H0zm60 0l-3 3-3-3h6zM60 12l-3 3-3-3h6zm0-6l-3 3-3-3h6zm0 30l-3 3-3-3h6zm0 18l-3 3-3-3h6zM30 60l-3-3-3 3h6zm18 0l-3-3-3 3h6zm-36 0l3-3 3 3h-6zm36-60l-3 3-3-3h6zm-36 0l3 3 3-3h-6z' fill='%23a855f7' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")` }}>
            </div>

            <div className="absolute inset-0 pointer-events-none">
                <div className="crystal c1 absolute top-1/4 left-1/4 w-12 h-16 bg-purple-500/20 blur-md animate-float-slow rotate-12"></div>
                <div className="crystal c2 absolute bottom-1/3 right-1/4 w-16 h-20 bg-purple-400/10 blur-xl animate-float-fast -rotate-45"></div>
                <div className="crystal c3 absolute top-2/3 left-1/2 w-10 h-14 bg-purple-600/15 blur-lg animate-float-mid rotate-[30deg]"></div>
                <div className="crystal c4 absolute top-1/3 right-1/3 w-8 h-8 bg-purple-600/30 blur-sm animate-float rotate-45"></div>
            </div>

            {/* 네온 퍼플 터미널 인터페이스 */}
            <div className="relative w-full max-w-lg z-10 mx-4 animate-flicker">
                {/* 외곽 글로우 효과 (blur-xl) */}
                <div className="absolute -inset-1 bg-purple-600/20 rounded-sm blur-xl"></div>

                {/* 터미널 본체 (강렬한 보라색 네온 픽셀 테두리) */}
                <div className="relative border-2 border-purple-500 bg-[#0a0015]/95 rounded-sm overflow-hidden shadow-[0_0_25px_rgba(168,85,247,0.4)]">

                    {/* 상단 타이틀 바: 레트로 윈도우 스타일 */}
                    <div className="bg-purple-900/50 border-b-2 border-purple-500 px-4 py-2 flex items-center justify-between select-none">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-purple-500 shadow-[0_0_5px_#a855f7]"></div>
                            <span className="text-[10px] tracking-widest text-purple-200">INITIALIZING_AGENT_ID</span>
                        </div>
                        <div className="flex gap-2 opacity-50">
                            <div className="w-2 h-2 border border-purple-500"></div>
                            <div className="w-2 h-2 border border-purple-500"></div>
                        </div>
                    </div>

                    {/* 터미널 내부 콘텐츠 */}
                    <div className="p-8 md:p-10 relative">
                        {/* 미묘한 보라색 그리드 패턴 오버레이 (깊이감 부여) */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                             style={{ backgroundImage: 'linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
                        </div>

                        <div className="relative z-20">
                            <div className="mb-12 space-y-3">
                                <div className="flex items-center gap-2 text-[9px] text-purple-500/80 tracking-widest animate-pulse">
                                    <span className="w-1 h-1 bg-purple-500 rounded-full"></span>
                                    <span>NEURAL_INTERFACE_ESTABLISHED</span>
                                </div>
                                <h2 className="text-2xl md:text-3xl text-white tracking-[0.2em] border-l-4 border-purple-500 pl-5 uppercase drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                                    INPUT NICKNAME
                                </h2>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-12">
                                <div className="space-y-6">
                                    <div className="relative group">
                                        <label className="block text-[10px] text-purple-400 mb-2 tracking-[0.2em] opacity-60">DESIGNATION://</label>
                                        <input
                                            type="text"
                                            value={nickname}
                                            onChange={(e) => setNickname(e.target.value)}
                                            required
                                            maxLength={15}
                                            disabled={isPending}
                                            autoComplete="off"
                                            className="w-full bg-purple-900/10 border-b-2 border-purple-500/30 px-0 py-4 focus:outline-none focus:border-purple-400 text-2xl tracking-[0.2em] placeholder:text-purple-900 transition-all text-white font-bold"
                                        />
                                        {/* 입력창 인터랙션 강조 선 */}
                                        <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-purple-400 transition-all duration-500 group-focus-within:w-full shadow-[0_0_8px_#a855f7]"></div>

                                        <div className="absolute top-0 right-0 p-2 text-[10px] text-purple-600">
                                            {nickname.length}/15
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-purple-500/60 tracking-tighter uppercase">
                                        {`>> [NOTICE]: NICKNAME_IS_PERMANENT_AFTER_STABILIZATION`}
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isPending || !nickname.trim()}
                                    className="w-full relative group overflow-hidden border-2 border-purple-500 py-5 active:scale-[0.98] transition-transform"
                                >
                                    {/* 버튼 호버 배경 채우기 애니메이션 */}
                                    <div className="absolute inset-0 translate-y-full group-hover:translate-y-0 bg-purple-600 transition-transform duration-300 ease-out"></div>
                                    <span className="relative z-10 text-sm tracking-[0.4em] font-bold text-purple-400 group-hover:text-white transition-colors">
                                        {isPending ? 'STABILIZING...' : 'SUBMIT'}
                                    </span>
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* 하단 시스템 상태바 (UX 강화) */}
                    <div className="bg-purple-950/40 border-t border-purple-500/20 px-5 py-3 flex justify-between items-center text-[9px] text-purple-500/50 tracking-tighter font-mono">
                        <div className="flex gap-4">
                            <span>SYS_STATUS: OPTIMAL</span>
                            <span>GRAV_LEVEL: 0.00G</span>
                        </div>
                        <div className="flex gap-4 text-right">
                            <span>SESS_ID: 0xBF102</span>
                            <span className="animate-pulse">● LIVE</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 애니메이션 및 커스텀 스타일 정의 */}
            <style>{`
                @keyframes flicker {
                    0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100% { opacity: 1; }
                    20%, 21.999%, 63%, 63.999%, 65%, 69.999% { opacity: 0.9; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); }
                    50% { transform: translateY(-25px) rotate(calc(var(--rot, 0deg) + 7deg)); }
                }
                .animate-flicker {
                    animation: flicker 5s infinite;
                }
                .animate-float {
                    animation: float 4s ease-in-out infinite;
                }
                .animate-float-slow {
                    animation: float 10s ease-in-out infinite;
                    --rot: 12deg;
                }
                .animate-float-mid {
                    animation: float 7s ease-in-out infinite;
                    --rot: 30deg;
                }
                .animate-float-fast {
                    animation: float 5s ease-in-out infinite;
                    --rot: -45deg;
                }
                /* 결정체 모양 clip-path */
                .crystal {
                    clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);
                }
                /* 스크롤바 커스텀 (필요 시) */
                ::-webkit-input-placeholder {
                    color: rgba(168, 85, 247, 0.2);
                    letter-spacing: 0.1em;
                }
            `}</style>
        </div>
    );
};

export default SetupNicknamePage;
