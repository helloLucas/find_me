package com.lucas.hint.controller;

import com.lucas.auth.principal.CustomUserPrincipal;
import com.lucas.global.dto.BaseResponse;
import com.lucas.hint.dto.request.HintLiveRetrieveRequestDto;
import com.lucas.hint.dto.response.HintLiveRetrieveResponseDto;
import com.lucas.hint.service.HintRetrievalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 온디맨드 힌트 RAG 검색 검증용 테스트 컨트롤러입니다.
 *
 * <p>실서비스와 동일한 오케스트레이터를 호출해 챕터별 런타임 상태(Redis/PG)를 그대로 사용합니다.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/hints/test")
@RequiredArgsConstructor
public class HintTestController {

  private final HintRetrievalService hintRetrievalService;

  /**
   * 실시간 세션 기준 벡터 검색 결과를 반환합니다.
   *
   * <p>override 데이터를 받지 않고 sessionId 기반으로 현재 상태를 읽어오기 때문에 실서비스와 동일한 경로를 검증할
   * 수 있습니다.
   */
  @PostMapping("/live-retrieve")
  public ResponseEntity<BaseResponse<HintLiveRetrieveResponseDto>> liveRetrieve(
      @AuthenticationPrincipal CustomUserPrincipal principal,
      @Valid @RequestBody HintLiveRetrieveRequestDto request) {

    HintLiveRetrieveResponseDto response =
        hintRetrievalService.retrieveLive(principal.getUserId(), request);

    log.info(
        "Hint live retrieve tested. userId={}, sessionId={}, phase={}, evidenceCount={}",
        principal.getUserId(),
        response.getSessionId(),
        response.getSelectedPhase(),
        response.getEvidences() != null ? response.getEvidences().size() : 0);

    return ResponseEntity.ok(BaseResponse.success("RAG 검색 테스트 성공", response));
  }
}

