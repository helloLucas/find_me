package com.lucas.hint.service;

import com.lucas.hint.dto.request.HintLiveRetrieveRequestDto;
import com.lucas.hint.dto.response.HintLiveResponseDto;

/** 실시간 힌트 호출부 오케스트레이션 인터페이스다. */
public interface HintOrchestrationService {

  HintLiveResponseDto generateLiveHint(Long userId, HintLiveRetrieveRequestDto request);
}
