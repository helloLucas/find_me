import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUpdateNickname } from '../../features/User/useUpdateNickname';

/**
 * SetupNicknamePage
 */
const SetupNicknamePage = () => {
    const [nickname, setNickname] = useState('');
    const { mutate, isPending } = useUpdateNickname();
    const navigate = useNavigate();

    const isValid = nickname.trim().length >= 2;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid || isPending) return;
        mutate({ nickname });
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-[#0a0a0a] overflow-hidden font-pixel text-gray-400">

            {/* 배경 패턴 (회색 처리) */}
            <div className="absolute inset-0 opacity-5 pointer-events-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.828-1.415 1.415L51.8 0h2.827zM5.373 0l-.83.828L5.96 2.243 8.2 0H5.374zM48 0l3 3 3-3h-6zm-36 0l-3 3-3-3h6zM30 0l3 3 3-3h-6zM0 30l3 3 3-3H0zm0 18l3 3 3-3H0zM0 12l3 3 3-3H0zm0-6l3 3 3-3H0zm0 36l3 3 3-3H0zm60 0l-3 3-3-3h6zM60 12l-3 3-3-3h6zm0-6l-3 3-3-3h6zm0 30l-3 3-3-3h6zm0 18l-3 3-3-3h6zM30 60l-3-3-3 3h6zm18 0l-3-3-3 3h6zm-36 0l3-3 3 3h-6zm36-60l-3 3-3-3h6zm-36 0l3 3 3-3h-6z' fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")` }}>
            </div>

            <div className="absolute inset-0 pointer-events-none">
                <div className="crystal c1 absolute top-1/4 left-1/4 w-12 h-16 bg-gray-500/10 blur-md animate-float-slow rotate-12"></div>
                <div className="crystal c2 absolute bottom-1/3 right-1/4 w-16 h-20 bg-gray-400/5 blur-xl animate-float-fast -rotate-45"></div>
                <div className="crystal c3 absolute top-2/3 left-1/2 w-10 h-14 bg-gray-600/10 blur-lg animate-float-mid rotate-[30deg]"></div>
            </div>

            {/* 모노크롬 터미널 인터페이스 */}
            <div className="relative w-full max-w-lg z-10 mx-4 animate-flicker">
                {/* 외곽 미세 글로우 */}
                <div className="absolute -inset-0.5 bg-white/5 rounded-sm blur-sm"></div>

                {/* 터미널 본체 (금속질감 회색 테두리) */}
                <div className="relative border-2 border-gray-600 bg-[#121212]/95 rounded-sm overflow-hidden shadow-2xl">

                    {/* 상단 타이틀 바 (뒤로가기 버튼 통합) */}
                    <div className="bg-gray-800/80 border-b-2 border-gray-600 flex items-center justify-between select-none">
                        <div className="flex items-center">
                            <button
                                onClick={() => navigate('/')}
                                className="px-4 py-2 border-r border-gray-600 hover:bg-white hover:text-black transition-colors text-[10px] tracking-widest font-bold"
                            >
                                {"<"} BACK
                            </button>
                            <div className="flex items-center gap-3 px-4">
                                <div className="w-2 h-2 bg-gray-500"></div>
                                <span className="text-[10px] tracking-[0.3em] text-gray-400">INITIALIZE_ID</span>
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-30 pr-4">
                            <div className="w-2 h-2 border border-white"></div>
                            <div className="w-2 h-2 border border-white"></div>
                        </div>
                    </div>

                    {/* 터미널 내부 콘텐츠 */}
                    <div className="p-8 md:p-10 relative">
                        {/* 미묘한 도트 패턴 */}
                        <div className="absolute inset-0 opacity-[0.02]"
                            style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                        </div>

                        <div className="relative z-20">
                            <div className="mb-12 space-y-3 font-bold">
                                <div className="flex items-center gap-2 text-[9px] text-gray-500 tracking-widest animate-pulse">
                                    <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                                    <span>CONNECTION_STABLE</span>
                                </div>
                                <h2 className="text-2xl md:text-3xl text-white tracking-[0.2em] border-l-4 border-white pl-5 uppercase">
                                    INPUT NICKNAME
                                </h2>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-12">
                                <div className="space-y-6">
                                    <div className="relative group">
                                        <label className="block text-sm text-gray-500 mb-2 tracking-[0.2em]">IDENTIFIER://</label>
                                        <input
                                            type="text"
                                            value={nickname}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val.length <= 15) {
                                                    setNickname(val);
                                                }
                                            }}
                                            required
                                            minLength={2}
                                            maxLength={15}
                                            disabled={isPending}
                                            autoComplete="off"
                                            className="w-full bg-white/5 border-b-2 border-gray-700 px-0 py-6 focus:outline-none focus:border-white text-4xl tracking-[0.2em] placeholder:text-gray-800 transition-all text-white font-bold relative z-10"
                                        />
                                        {/* 커서 역할을 하는 하단 선 */}
                                        <div className="absolute bottom-0 left-0 w-0 h-[2px] bg-white transition-all duration-500 group-focus-within:w-full z-20"></div>

                                        <div className="absolute top-0 right-0 p-2 text-sm text-gray-700">
                                            {nickname.length}/15
                                        </div>
                                    </div>
                                    <p className={`text-sm tracking-wide uppercase relative z-10 transition-colors ${nickname.length > 0 && !isValid ? 'text-red-500' : 'text-gray-600'}`}>
                                        {nickname.length > 0 && !isValid 
                                            ? '>> [ERROR]: NICKNAME_TOO_SHORT (MIN_2_CHARS)' 
                                            : '>> [NOTICE]: ONCE_STABILIZED_NICKNAME_CANNOT_BE_MODIFIED'}
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isPending || !isValid}
                                    className={`w-full relative group overflow-hidden border-2 py-5 transition-all
                                        ${isValid ? 'border-gray-500 cursor-pointer active:scale-[0.98]' : 'border-gray-800 cursor-not-allowed opacity-50'}`}
                                >
                                    {/* 호버 시 화이트로 채워짐 (유효할 때만) */}
                                    {isValid && (
                                        <div className="absolute inset-0 translate-y-full group-hover:translate-y-0 bg-white transition-transform duration-300 ease-out"></div>
                                    )}
                                    <span className={`relative z-10 text-sm tracking-[0.4em] font-bold uppercase transition-colors
                                        ${isValid ? 'text-gray-400 group-hover:text-black' : 'text-gray-700'}`}>
                                        {isPending ? 'STABILIZING...' : 'ESTABLISH'}
                                    </span>
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* 하단 상태바 */}
                    <div className="bg-gray-900 border-t border-gray-800 px-5 py-3 flex justify-between items-center text-[9px] text-gray-600 tracking-widest font-mono relative z-10">
                        <div className="flex gap-4">
                            <span>S_STATUS: READY</span>
                            <span>AUTH: PENDING</span>
                        </div>
                        <div className="flex gap-4 text-right">
                            <span className="animate-pulse opacity-50">● ENCRYPTION_ON</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 애니메이션 스타일 */}
            <style>{`
                @keyframes flicker {
                    0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100% { opacity: 1; }
                    20%, 21.999%, 63%, 63.999%, 65%, 69.999% { opacity: 0.98; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); }
                    50% { transform: translateY(-15px) rotate(calc(var(--rot, 0deg) + 3deg)); }
                }
                .animate-flicker {
                    animation: flicker 6s infinite;
                }
                .animate-float-slow {
                    animation: float 12s ease-in-out infinite;
                    --rot: 12deg;
                }
                .animate-float-mid {
                    animation: float 9s ease-in-out infinite;
                    --rot: 30deg;
                }
                .animate-float-fast {
                    animation: float 6s ease-in-out infinite;
                    --rot: -45deg;
                }
                .crystal {
                    clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);
                }
            `}</style>
        </div>
    );
};

export default SetupNicknamePage;
