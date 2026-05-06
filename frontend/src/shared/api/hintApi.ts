import axiosInstance from './axiosInstance';
import type { BaseResponse } from '../types/api';

export interface HintLiveRequest {
  userMessage?: string;
  searchTopK?: number;
  evidenceLimit?: number;
  minSimilarity?: number;
}

export interface HintLiveResponseData {
  hint: string;
  hintLevel: string;
  messageType?: string;
  routeDecision?: string;
  selectedPhase?: string;
  lowConfidence?: boolean;
  failCountAfterAction?: number;
}

export const hintApi = {
  getLiveHint: async (request: HintLiveRequest): Promise<HintLiveResponseData> => {
    const response = await axiosInstance.post<BaseResponse<HintLiveResponseData>>(
      '/api/v1/hints/live',
      request
    );
    return response.data.data;
  },
};

