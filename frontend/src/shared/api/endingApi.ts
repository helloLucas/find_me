import axiosInstance from "./axiosInstance";
import type { BaseResponse } from "../types/api";
import type { EndingProgress, EndingResultScene, EndingTitleScene } from "../types/ending";

export const endingApi = {
  getProgress: async (): Promise<EndingProgress> => {
    const response = await axiosInstance.get<BaseResponse<EndingProgress>>("/api/v1/endings");
    return response.data.data;
  },

  getTitleScene: async (): Promise<EndingTitleScene> => {
    const response =
      await axiosInstance.get<BaseResponse<EndingTitleScene>>("/api/v1/endings/title-scene");
    return response.data.data;
  },

  getResultScene: async (endingType: string): Promise<EndingResultScene> => {
    const response = await axiosInstance.get<BaseResponse<EndingResultScene>>(
      "/api/v1/endings/result-scene",
      { params: { endingType } },
    );
    return response.data.data;
  },
};
