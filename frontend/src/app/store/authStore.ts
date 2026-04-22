import { create } from "zustand";
import { tokenManager } from "../../shared/utils/tokenManager";
import { jwtDecode } from "jwt-decode";

export type UserRole = 'GUEST' | 'MEMBER';

interface AuthState {
  isLoggedIn: boolean;
  role: UserRole | null;
  nickname: string;
  isInitialized: boolean;
  
  // Actions
  checkAuth: () => void;
  setAuth: (accessToken: string) => void;
  clearAuth: () => void;
}

/**
 * 전역 인증 상태 관리 스토어 (Zustand)
 * - Reactive State: 상태 변경 시 UI 즉각 반응
 * - History Resilience 지원을 위한 동기화 로직 포함
 */
export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  role: null,
  nickname: "ANONYMOUS",
  isInitialized: false,

  /**
   * 로컬 스토리지의 토큰을 기반으로 현재 인증 상태를 검증 및 동기화
   */
  checkAuth: () => {
    const accessToken = tokenManager.getAccessToken();
    if (accessToken) {
      try {
        const decoded: any = jwtDecode(accessToken);
        set({
          isLoggedIn: true,
          role: decoded.role || null,
          nickname: decoded.nickname || "UNKNOWN_AGENT",
          isInitialized: true,
        });
      } catch (e) {
        console.error("Auth initialization failed:", e);
        tokenManager.clearTokens();
        set({ isLoggedIn: false, role: null, nickname: "ANONYMOUS", isInitialized: true });
      }
    } else {
      set({ isLoggedIn: false, role: null, nickname: "ANONYMOUS", isInitialized: true });
    }
  },

  /**
   * 새로운 토큰 수동 설정
   */
  setAuth: (accessToken: string) => {
    try {
        const decoded: any = jwtDecode(accessToken);
        set({
          isLoggedIn: true,
          role: decoded.role || null,
          nickname: decoded.nickname || "UNKNOWN_AGENT",
          isInitialized: true,
        });
    } catch (e) {
        console.error("Invalid token set:", e);
    }
  },

  /**
   * 인증 상태 초기화
   */
  clearAuth: () => {
    tokenManager.clearTokens();
    set({ isLoggedIn: false, role: null, nickname: "ANONYMOUS" });
  },
}));
