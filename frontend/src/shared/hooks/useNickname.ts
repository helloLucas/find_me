import { useState, useEffect } from 'react';

export type SessionMode = 'USER' | 'GUEST';

/**
 * 3. useNickname 훅 (Hook)
 * - USER_MODE: 서버 API 또는 LocalStorage 기반 판별
 * - GUEST_MODE: localStorage에서 'guest_nickname' 조회 (없을 시 'GUEST')
 */
export const useNickname = () => {
    const [nickname, setNickname] = useState<string>('GUEST');
    const [mode, setMode] = useState<SessionMode>('GUEST');

    useEffect(() => {
        const accessToken = localStorage.getItem('accessToken');
        const guestNickname = localStorage.getItem('guest_nickname');

        if (accessToken) {
            // 실제 환경에서는 JWT Decoding 또는 API 응답값 사용
            setNickname('USER_LOGGED_IN'); 
            setMode('USER');
        } else if (guestNickname) {
            setNickname(guestNickname);
            setMode('GUEST');
        } else {
            setNickname('GUEST');
            setMode('GUEST');
        }
    }, []);

    return { nickname, mode };
};
