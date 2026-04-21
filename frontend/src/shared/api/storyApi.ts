import { apiClient } from "./client";
import type { StoryNodeResponse, TransitionRequest, TransitionResponse } from "../types/story";

export const storyApi = {
  startStory: (chapterCode: string): Promise<StoryNodeResponse> => {
    return apiClient.post<StoryNodeResponse>("/api/v1/story/start", { chapterCode });
  },

  getCurrentNode: (): Promise<StoryNodeResponse> => {
    return apiClient.get<StoryNodeResponse>("/api/v1/story/current");
  },

  submitTransition: (request: TransitionRequest): Promise<TransitionResponse> => {
    return apiClient.post<TransitionResponse>("/api/v1/story/transitions", request);
  },
};
