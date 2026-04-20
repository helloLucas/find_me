import { apiClient } from "./client";
import type { TransitionRequest, TransitionResponse } from "../types/story";

export const storyApi = {
  submitTransition: (request: TransitionRequest): Promise<TransitionResponse> => {
    return apiClient.post<TransitionResponse>("/api/v1/story/transitions", request);
  },
};
