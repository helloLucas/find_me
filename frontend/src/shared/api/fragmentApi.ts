import axiosInstance from "./axiosInstance";
import type { BaseResponse } from "../types/api";

export const fragmentApi = {
  checkFragment: async (code: string): Promise<boolean> => {
    const response = await axiosInstance.get<BaseResponse<boolean>>(`/api/v1/fragments/check/${code}`);
    return response.data.data;
  },

  acquireFragment: async (code: string): Promise<void> => {
    await axiosInstance.post<BaseResponse<null>>(`/api/v1/fragments/acquire/${code}`);
  },
};
