package com.lucas.hint.service;

import com.lucas.hint.dto.request.HintLiveRetrieveRequestDto;
import com.lucas.hint.dto.response.HintLiveRetrieveResponseDto;

/** 온디맨드 힌트 벡터 검색 오케스트레이션 서비스입니다. */
public interface HintRetrievalService {

  /** 실시간 세션 기준으로 벡터 검색을 수행해 evidence를 반환합니다. */
  HintLiveRetrieveResponseDto retrieveLive(Long userId, HintLiveRetrieveRequestDto request);
}

