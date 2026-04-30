import axiosInstance from "./axiosInstance";
import type { BaseResponse } from "../types/api";
import type { StoryNodeResponse, TransitionRequest, TransitionResponse } from "../types/story";

export const storyApi = {
  startStory: async (chapterCode: string): Promise<StoryNodeResponse> => {
    const response = await axiosInstance.post<BaseResponse<StoryNodeResponse>>(
      "/api/v1/story/start",
      { chapterCode }
    );
    return response.data.data;
  },

  getCurrentNode: async (): Promise<StoryNodeResponse> => {
    const response = await axiosInstance.get<BaseResponse<StoryNodeResponse>>(
      "/api/v1/story/current"
    );
    return response.data.data;
  },

  submitTransition: async (request: TransitionRequest): Promise<TransitionResponse> => {
    const response = await axiosInstance.post<BaseResponse<TransitionResponse>>(
      "/api/v1/story/transitions",
      request
    );
    return response.data.data;
  },

  getRecentCommands: async (): Promise<string[]> => {
    const response = await axiosInstance.get<BaseResponse<string[]>>(
      "/api/v1/story/recent-commands"
    );
    return response.data.data;
  },
};
