import { create } from "zustand";
import { tokenManager } from "../../shared/utils/tokenManager";
import { jwtDecode } from "jwt-decode";

export type UserRole = 'GUEST' | 'MEMBER' | 'ADMIN';

type AuthUserProfile = {
  nickname?: string;
  role?: UserRole | null;
};

interface AuthState {
  isLoggedIn: boolean;
  role: UserRole | null;
  nickname: string;
  isInitialized: boolean;

  // Actions
  checkAuth: () => void;
  setAuth: (accessToken: string) => void;
  setUserProfile: (profile: AuthUserProfile) => void;
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
        console.error("인증 상태 초기화에 실패했습니다:", e);
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
      console.error("유효하지 않은 토큰입니다:", e);
    }
  },

  setUserProfile: (profile) => {
    set((state) => ({
      isLoggedIn: true,
      role: profile.role ?? state.role,
      nickname: profile.nickname ?? state.nickname,
      isInitialized: true,
    }));
  },

  /**
   * 인증 상태 완전 초기화 (로그아웃 / refresh 실패)
   * - 토큰을 모두 정리하고 role을 null로 설정
   */
  clearAuth: () => {
    tokenManager.clearTokens();
    set({ isLoggedIn: false, role: null, nickname: 'ANONYMOUS', isInitialized: true });
  },
}));
