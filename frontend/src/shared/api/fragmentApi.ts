import axiosInstance from "./axiosInstance";
import type { BaseResponse } from "../types/api";

export const fragmentApi = {
  checkFragment: async (code: string): Promise<boolean> => {
    const response = await axiosInstance.get<BaseResponse<boolean>>(`/api/v1/fragments/check/${code}`);
    return response.data.data;
  },

  startMinigame: async (code: string): Promise<string> => {
    const response = await axiosInstance.post<BaseResponse<{ sessionId: string }>>(`/api/v1/fragments/start/${code}`);
    return response.data.data.sessionId;
  },

  acquireFragment: async (code: string, sessionId: string): Promise<void> => {
    await axiosInstance.post<BaseResponse<null>>(`/api/v1/fragments/acquire/${code}?sessionId=${sessionId}`);
  },
};
