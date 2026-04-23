import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tokenManager } from '../../shared/utils/tokenManager';

/**
 * OAuthCallbackPage
 *
 * OAuth2 로그인 성공 후 백엔드에서 리다이렉트되어 도달하는 페이지입니다.
 * URL 파라미터에서 토큰과 신규 유저 여부를 파싱하여 초기화 및 라우팅을 수행합니다.
 */
const OAuthCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
          const accessToken = searchParams.get('accessToken');
          const isNewUser = searchParams.get('isNewUser') === 'true';
          const tempKey = searchParams.get('tempKey');
          const guestId = searchParams.get('guestId');

          // 1. 이미 가입된 회원이거나 게스트 승격 완료된 경우
          if (accessToken) {
            tokenManager.setAccessToken(accessToken);

            if (window.opener) {
              window.opener.postMessage({
                type: 'AUTH_SUCCESS',
                accessToken,
                isNewUser
              }, window.location.origin);
              window.close();
              return;
            }

            // 회원이면 로비로, 신규 가입자면 닉네임 설정으로 (기존 로직 유지)
            if (isNewUser) {
                navigate('/setup-nickname', { replace: true });
            } else {
                navigate('/lobby', { replace: true });
            }
            return;
        } 
        
        // 2. 신규 가입 대기 상태 (DB 저장 전, Redis 임시 키 보유)
        if (tempKey) {
            if (window.opener) {
                window.opener.postMessage({
                    type: 'AUTH_PENDING_REGISTRATION',
                    tempKey,
                    guestId
                }, window.location.origin);
                window.close();
                return;
            }
            // 닉네임 설정 페이지로 이동할 때 tempKey와 guestId를 state로 전달
            navigate('/setup-nickname', { 
                replace: true, 
                state: { tempKey, guestId } 
            });
            return;
        }

        // 3. 에러 케이스
        console.error('Authentication failed: Missing tokens or keys in callback URL');
        if (window.opener) {
            window.opener.postMessage({ type: 'AUTH_ERROR' }, window.location.origin);
            window.close();
            return;
        }
        navigate('/login', { replace: true });
    }, [searchParams, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0c08] text-[#a3e635] font-pixel p-4">
            <div className="relative">
                {/* 메인 로딩 텍스트 */}
                <div className="text-2xl md:text-3xl mb-12 animate-pulse tracking-[0.2em] text-center leading-relaxed">
                    AUTHENTICATING...
                    <br />
                    <span className="text-xs md:text-sm opacity-50 mt-2 block">
                        ESTABLISHING SECURE RELAY
                    </span>
                </div>

                {/* 프로그레스 바 (Cyberpunk Style) */}
                <div className="w-64 md:w-80 h-3 border border-[#a3e635] bg-[#0a0c08] relative overflow-hidden mb-8">
                    <div
                        className="h-full bg-[#a3e635] animate-loading-bar"
                        style={{ width: '30%' }}
                    ></div>
                </div>

                {/* 시스템 메시지 터미널 스타일 */}
                <div className="space-y-2 text-[8px] md:text-[10px] opacity-70 uppercase tracking-tighter max-w-xs mx-auto">
                    <div className="flex justify-between">
                        <span>{">"} INITIALIZING AUTH PROTOCOL</span>
                        <span className="text-[#a3e635]">DONE</span>
                    </div>
                    <div className="flex justify-between">
                        <span>{">"} DECRYPTING JWT PAYLOAD</span>
                        <span className="text-[#a3e635]">88%</span>
                    </div>
                    <div className="flex justify-between animate-pulse">
                        <span>{">"} SYNCING NEURAL SIGNATURE</span>
                        <span className="text-[#ff0055]">WAIT...</span>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes loading-bar {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(333%); }
                }
                .animate-loading-bar {
                    animation: loading-bar 2s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default OAuthCallbackPage;
