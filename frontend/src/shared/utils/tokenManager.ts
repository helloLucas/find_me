/**
 * AuthStorage 유틸리티
 * 
 * Access Token과 Refresh Token을 관리합니다.
 * 우선 LocalStorage를 사용하지만, 추후 HttpOnly 쿠키 등으로 전환 시
 * 이 유틸리티의 구현부만 수정하면 되도록 추상화되었습니다.
 */

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const tokenManager = {
  /**
   * Access Token 관리
   */
  getAccessToken: (): string | null => {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  setAccessToken: (token: string): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  deleteAccessToken: (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  },

  /**
   * Refresh Token 관리
   */
  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken: (token: string): void => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  deleteRefreshToken: (): void => {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  /**
   * 모든 토큰 삭제 (로그아웃 등)
   */
  clearTokens: (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
