import axios from 'axios';
import { tokenManager } from '../utils/tokenManager';
import { env } from '../config/env';
import type { BaseResponse } from '../types/api';
import { isConnectionError } from './apiError';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipGlobalError?: boolean;
  }
}

/**
 * Axios Instance 설정
 *
 * 모든 요청에 JWT Access Token을 자동으로 주입하고,
 * 401 에러 발생 시 Refresh Token을 이용해 토큰을 자동 갱신합니다.
 *
 * [대기열(Queue) 패턴]
 * 토큰 갱신이 진행되는 동안 401을 받은 후속 요청들을 failedQueue에 보류시키고,
 * 갱신 완료 후 일괄 재시도합니다. 이를 통해 다중 401 경쟁 조건을 방지합니다.
 */

// ─── 모듈 수준 대기열 상태 ───────────────────────────────────────────────────
// 컴포넌트 라이프사이클과 독립적으로, 인터셉터가 마운트되는 동안 항상 유효합니다.

/** 현재 토큰 갱신 요청이 진행 중인지 여부 */
let isRefreshing = false;

/** 갱신 완료를 기다리는 요청들의 대기열 */
interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}
let failedQueue: QueueItem[] = [];

/**
 * 대기열에 있는 모든 요청을 처리합니다.
 * @param error - 갱신 실패 시 전달할 에러 객체 (성공 시 null)
 * @param token - 갱신 성공 시 전달할 새 액세스 토큰 (실패 시 null)
 */
function processQueue(error: unknown | null, token: string | null = null): void {
  failedQueue.forEach((item) => {
    if (error) {
      item.reject(error);
    } else {
      item.resolve(token!);
    }
  });
  failedQueue = [];
}
// ────────────────────────────────────────────────────────────────────────────

const axiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // JWT Refresh Token 쿠키를 서버로 전송하기 위해 필수
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

// Response Interceptor: 401 Unauthorized 감지 시 토큰 갱신 로직 (대기열 패턴 포함)
axiosInstance.interceptors.response.use(
  (response) => {
    void import('../../app/store/connectionStatusStore').then(({ useConnectionStatusStore }) => {
      useConnectionStatusStore.getState().markOnline();
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const errorCode = error.response?.data?.code;
    const status = error.response?.status;

    // 네트워크 에러 또는 500번대 서버 에러 글로벌 핸들링
    const isNetworkOrServerError = isConnectionError(error);

    // AppShell의 Silent Refresh가 진행 중인 경우 전역 에러 모달 표시를 건너뜁니다.
    // skipGlobalError 요청도 네트워크/5xx 연결 실패는 사용자가 알아야 하므로 팝업을 표시합니다.
    const isSilentRefreshing = sessionStorage.getItem('is_silent_refreshing') === 'true';

    if (isNetworkOrServerError && !isSilentRefreshing) {
      console.error('Network or Server error occurred:', error);
      try {
        const { useConnectionStatusStore } = await import('../../app/store/connectionStatusStore');
        const { openConnectionFailedModal } = await import('../../app/store/modalStore');
        useConnectionStatusStore.getState().markOffline();
        openConnectionFailedModal();
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
          // 1. 인증 토큰만 디스크 상에서 안전하게 삭제
          tokenManager.clearTokens();
          // 2. 즉시 메인 페이지로 이동 (모달이 배경을 가려주는 동안)
          window.location.href = '/';
          // 3. true를 반환하여 GlobalModal의 closeModal() 작동을 생략 (시각적 방패 유지)
          return true;
        },
      });
      return Promise.reject(error);
    }

    // ─── 401 에러 + 대기열(Queue) 처리 ────────────────────────────────────────
    if (status === 401 && !originalRequest._retry) {
      // _retry 플래그: 이미 재시도한 요청이 다시 401을 받는 무한 루프 방지
      originalRequest._retry = true;

      if (isRefreshing) {
        // [대기열 패턴] 이미 다른 요청이 갱신을 진행 중인 경우:
        // 현재 요청을 Promise로 래핑하여 failedQueue에 보류시킵니다.
        // processQueue가 호출될 때 새 토큰으로 resolve되어 재시도됩니다.
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axiosInstance(originalRequest);
          })
          .catch((queueError) => {
            return Promise.reject(queueError);
          });
      }

      // [대기열 패턴] 이 요청이 첫 번째 401: 갱신 프로세스를 직접 시작합니다.
      isRefreshing = true;

      try {
        // Refresh API 호출 (HttpOnly 쿠키 방식 → 바디에 토큰 불필요)
        const response = await axios.post<BaseResponse<{ accessToken: string }>>(
          `${axiosInstance.defaults.baseURL}/api/v1/auth/refresh`,
          undefined,
          { withCredentials: true }
        );

        const { accessToken } = response.data.data;

        // 새 토큰 저장
        tokenManager.setAccessToken(accessToken);
        // 원래 요청 헤더 갱신
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // 대기 중이던 모든 요청에 새 토큰을 전달하여 일괄 재시도
        processQueue(null, accessToken);

        return axiosInstance(originalRequest);

      } catch (refreshError) {
        if (isConnectionError(refreshError)) {
          console.error('Token refresh failed due to network/server error.', refreshError);
          processQueue(refreshError, null);

          try {
            const { useConnectionStatusStore } = await import('../../app/store/connectionStatusStore');
            const { openConnectionFailedModal } = await import('../../app/store/modalStore');
            useConnectionStatusStore.getState().markOffline();
            openConnectionFailedModal();
          } catch (modalError) {
            console.error('Failed to open global connection error modal:', modalError);
          }

          return Promise.reject(refreshError);
        }

        // 리프레시 토큰도 만료 → 대기열 전체를 에러로 처리 후 세션 종료
        console.error('Token refresh failed in interceptor. Clearing session.', refreshError);

        processQueue(refreshError, null);

        const { useAuthStore } = await import('../../app/store/authStore');
        useAuthStore.getState().clearAuth();

        sessionStorage.setItem('show_session_expired_popup', 'true');
        window.location.href = '/';

        return Promise.reject(refreshError);

      } finally {
        // 갱신 성공/실패와 상관없이 isRefreshing 플래그를 반드시 해제합니다.
        isRefreshing = false;
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    return Promise.reject(error);
  }
);

export default axiosInstance;
