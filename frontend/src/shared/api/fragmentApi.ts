import { apiClient } from "./client";

export const fragmentApi = {
  checkFragment: (code: string): Promise<boolean> => {
    return apiClient.get<boolean>(`/api/v1/fragments/check/${code}`);
  },

  acquireFragment: (code: string): Promise<void> => {
    return apiClient.post(`/api/v1/fragments/acquire/${code}`);
  }
};
