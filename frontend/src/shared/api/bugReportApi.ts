import axiosInstance from "./axiosInstance";
import type { BaseResponse } from "../types/api";

export const bugReportApi = {
  sendBugReport: async (formData: FormData): Promise<void> => {
    await axiosInstance.post<BaseResponse<void>>("/api/v1/bugreports", formData, {
      headers: {
        // axiosInstance의 기본값(application/json)을 덮어쓰기 위해 명시적으로 지정
        "Content-Type": "multipart/form-data",
      },
    });
  },
};
