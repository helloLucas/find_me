import axiosInstance from "./axiosInstance";
import type { BaseResponse } from "../types/api";

export type CurrentUserResponse = {
  id: number;
  nickname: string;
  role: "GUEST" | "MEMBER";
  lastLoginAt: string | null;
};

export const userApi = {
  getMe: async (): Promise<CurrentUserResponse> => {
    const response = await axiosInstance.get<BaseResponse<CurrentUserResponse>>("/api/v1/users/me");
    return response.data.data;
  },
};
