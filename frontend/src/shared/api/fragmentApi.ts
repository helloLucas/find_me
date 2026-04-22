import { apiClient } from "./client";

export const fragmentApi = {
  checkFragment: (code: string): Promise<boolean> => {
    return apiClient.get<{ data: boolean }>(`/api/v1/fragments/check/${code}`)
      .then(res => res.data.data);
  },

  acquireFragment: (code: string): Promise<void> => {
    return apiClient.post(`/api/v1/fragments/acquire/${code}`);
  }
};
