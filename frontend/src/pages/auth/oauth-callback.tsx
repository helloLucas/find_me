import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tokenManager } from '../../shared/utils/tokenManager';
import { useUpdateNickname } from '../../features/User/useUpdateNickname';

/**
 * OAuthCallbackPage
 *
 * OAuth2 로그인 성공 후 백엔드에서 리다이렉트되어 도달하는 페이지입니다.
 * URL 파라미터에서 토큰과 신규 유저 여부를 파싱하여 초기화 및 라우팅을 수행합니다.
 */
const OAuthCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { mutate } = useUpdateNickname();
    const processedRef = useRef(false);

    useEffect(() => {
        if (processedRef.current) return;

        const accessToken = searchParams.get('accessToken');
        const isNewUser = searchParams.get('isNewUser') === 'true';
        const tempKey = searchParams.get('tempKey');
        const guestId = searchParams.get('guestId');
        const nickname = searchParams.get('nickname');
        const isConflict = searchParams.get('isConflict') === 'true';

        // 1. 이미 가입된 회원이거나 게스트 승격 완료된 경우
        if (accessToken) {
            processedRef.current = true;
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

        // 2. 신규 가입 대기 상태 또는 계정 전환 대기 상태
        if (tempKey) {
            processedRef.current = true;

            // [계정 전환(Switch) 케이스]: 이미 가입된 소셜 계정이 있는 경우
            if (isConflict) {
                console.log('Account conflict detected.');

                if (window.opener) {
                    window.opener.postMessage({
                        type: 'AUTH_CONFLICT',
                        tempKey
                    }, window.location.origin);
                    window.close();
                    return;
                }

                // 동적 임포트 후 상태 가져오기 (단독 페이지일 경우 대비)
                import('../../app/store/modalStore').then((module) => {
                    const openModal = module.useModalStore.getState().openModal;
                    openModal({
                        title: 'ACCOUNT_CONFLICT',
                        message: '이미 이 소셜 계정으로 가입된 정보가 존재합니다.\n해당 계정으로 전환하시겠습니까?\n(현재 게스트 정보는 사라집니다.)',
                        type: 'confirm',
                        onConfirm: () => {
                            mutate({
                                tempKey,
                                nickname: '',
                                confirmSwitch: true
                            });
                        },
                        onCancel: () => {
                            navigate('/', { replace: true });
                        }
                    });
                }).catch(err => {
                    console.error('Failed to load modalStore:', err);
                    navigate('/', { replace: true });
                });
                return;
            }

            // [자동 승격(Upgrade) 케이스]: 게스트 정보가 있으면 바로 register 호출
            if (guestId && nickname) {
                console.log('Detected guest session. Performing automatic linking...');
                mutate({
                    tempKey,
                    nickname,
                    guestId: parseInt(guestId, 10),
                    confirmSwitch: false
                });
                return;
            }

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
        processedRef.current = true;
        if (window.opener) {
            window.opener.postMessage({ type: 'AUTH_ERROR' }, window.location.origin);
            window.close();
            return;
        }
        navigate('/', { replace: true });
    }, [searchParams, navigate, mutate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0c08] text-[#a3e635] font-auth-flow p-4">
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
