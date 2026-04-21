import axios from 'axios';
import { tokenManager } from '../utils/tokenManager';
import type { BaseResponse } from '../types/api';

/**
 * Axios Instance 설정
 * 
 * 모든 요청에 JWT Access Token을 자동으로 주입하고,
 * 401 에러 발생 시 Refresh Token을 이용해 토큰을 자동 갱신합니다.
 */
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
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

        // 401 에러이고, 이미 재시도를 한 요청이 아닐 경우에만 리프레시 시도
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = tokenManager.getRefreshToken();
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                // Refresh API 호출 (백엔드 명세: POST /api/v1/auth/refresh)
                // HttpOnly 쿠키 방식을 사용하므로 바디에 토큰을 실어 보낼 필요가 없으며, 
                // withCredentials: true를 설정하여 브라우저가 쿠키를 서버로 보내도록 합니다.
                const response = await axios.post<BaseResponse<{ accessToken: string; refreshToken: string }>>(
                    `${axiosInstance.defaults.baseURL}/api/v1/auth/refresh`,
                    {},
                    { withCredentials: true }
                );

                const { accessToken, refreshToken: newRefreshToken } = response.data.data;

                // 새로운 토큰 저장
                tokenManager.setAccessToken(accessToken);
                if (newRefreshToken) {
                    tokenManager.setRefreshToken(newRefreshToken);
                }

                // 실패했던 원래 요청의 헤더를 갱신하여 재전송
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                // 리프레시 토큰도 만료되었거나 오류 발생 시 인증 정보 초기화 및 로그인 이동
                console.error('Session expired. Please login again.');
                tokenManager.clearTokens();
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
