import { apiClient } from "./client";
import { tokenManager } from "../utils/tokenManager";

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  userId: number;
  role: "GUEST" | "MEMBER" | string;
  nickname: string;
  isNewUser?: boolean;
}

export const authApi = {
  initGuest: async (): Promise<TokenResponse> => {
    const response = await apiClient.get<TokenResponse>("/api/v1/auth/guest-init");
    tokenManager.setAccessToken(response.accessToken);
    if (response.refreshToken) {
      tokenManager.setRefreshToken(response.refreshToken);
    }
    return response;
  },

  ensureGuestSession: async (): Promise<void> => {
    if (tokenManager.getAccessToken()) return;
    await authApi.initGuest();
  },
};
