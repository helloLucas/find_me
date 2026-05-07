import axios from 'axios';
import { tokenManager } from '../utils/tokenManager';
import { env } from '../config/env';
import type { BaseResponse } from '../types/api';

/**
 * Axios Instance 설정
 * 
 * 모든 요청에 JWT Access Token을 자동으로 주입하고,
 * 401 에러 발생 시 Refresh Token을 이용해 토큰을 자동 갱신합니다.
 */
const axiosInstance = axios.create({
    baseURL: env.apiBaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true // JWT Refresh Token 쿠키를 서버로 전송하기 위해 필수
});

// Request Interceptor: 모든 요청 헤더에 Authorization Bearer 토큰 주입
axiosInstance.interceptors.request.use(
    (config) => {
        const token = tokenManager.getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: 401 Unauthorized 감지 시 토큰 갱신 로직
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        const errorCode = error.response?.data?.code;
        const status = error.response?.status;

        // 네트워크 에러 또는 500번대 서버 에러 글로벌 핸들링
        const isNetworkError = !error.response;
        const isServerError = status && status >= 500 && status < 600;

        if (isNetworkError || isServerError) {
            console.error('Network or Server error occurred:', error);
            try {
                const { useModalStore } = await import('../../app/store/modalStore');
                useModalStore.getState().openModal({
                    title: 'CONNECTION_FAILED',
                    message: '서버와 연결할 수 없습니다. \n네트워크 상태를 확인해 주세요.',
                    type: 'alert',
                    onConfirm: async () => {
                        // 1. 토큰 삭제
                        tokenManager.clearTokens();
                        // 2. 인증 상태 완전 초기화
                        const { useAuthStore } = await import('../../app/store/authStore');
                        useAuthStore.getState().clearAuth();
                        // 3. 루트 페이지로 리다이렉트
                        window.location.href = '/';
                        return true;
                    }
                });
            } catch (modalError) {
                console.error('Failed to open global connection error modal:', modalError);
            }
            return Promise.reject(error);
        }

        // E1002: Redis 임시 세션 만료 (register 등 인증 불필요 엔드포인트에서 발생)
        // 토큰 리프레시를 시도하지 않고 바로 세션 만료 팝업을 표시한다.
        if (status === 401 && errorCode === 'E1002') {
            const { useModalStore } = await import('../../app/store/modalStore');
            useModalStore.getState().openModal({
                title: 'SESSION_EXPIRED',
                message: '세션이 만료되었습니다.\n다시 로그인해 주세요.',
                type: 'alert',
                onConfirm: () => {
                    // 1. 상태 초기화 생략 (하드 리다이렉트 시 메모리가 날아가므로 불필요)
                    // 2. 인증 토큰만 디스크 상에서 안전하게 삭제
                    tokenManager.clearTokens();
                    // 3. 즉시 메인 페이지로 이동 (화면이 전환될 때까지 모달이 기존 배경을 가려줌)
                    window.location.href = '/';
                    // 4. true를 반환하여 GlobalModal의 closeModal() 작동을 생략 (시각적 방패 유지)
                    return true;
                },
            });
            return Promise.reject(error);
        }

        // 401 에러이고, 이미 재시도를 한 요청이 아닐 경우에만 리프레시 시도
        if (status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Refresh API 호출 (백엔드 명세: POST /api/v1/auth/refresh)
                // HttpOnly 쿠키 방식을 사용하므로 바디에 토큰을 실어 보낼 필요가 없으며,
                // withCredentials: true를 설정하여 브라우저가 쿠키를 서버로 보내도록 합니다.
                const response = await axios.post<BaseResponse<{ accessToken: string }>>(
                    `${axiosInstance.defaults.baseURL}/api/v1/auth/refresh`,
                    undefined,
                    { withCredentials: true }
                );

                const { accessToken } = response.data.data;

                // 새로운 토큰 저장
                tokenManager.setAccessToken(accessToken);
                // 실패했던 원래 요청의 헤더를 갱신하여 재전송
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                // 리프레시 토큰도 만료되었거나 오류 발생 시 인증 정보 초기화 및 로그인 이동
                console.error('Session expired. Please login again.');

                // authStore.clearAuth() 를 통해 토큰 정리 + 상태 초기화
                const { useAuthStore } = await import('../../app/store/authStore');
                useAuthStore.getState().clearAuth();

                // 팝업 알림을 위한 플래그 설정 (AppShell에서 감지)
                sessionStorage.setItem('show_session_expired_popup', 'true');

                window.location.href = '/';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
