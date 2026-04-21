import { apiClient } from "./client";
import { env } from "../config/env";
import { getAccessToken, setTokens } from "./tokenStorage";

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
    setTokens(response);
    return response;
  },

  ensureGuestSession: async (): Promise<void> => {
    if (env.devAuthToken) return;
    if (getAccessToken()) return;
    await authApi.initGuest();
  },
};
