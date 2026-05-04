package com.lucas.hint.controller;

import com.lucas.auth.principal.CustomUserPrincipal;
import com.lucas.global.dto.BaseResponse;
import com.lucas.hint.dto.request.HintLiveRetrieveRequestDto;
import com.lucas.hint.dto.response.HintLiveResponseDto;
import com.lucas.hint.service.HintOrchestrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 실사용 힌트 호출 엔드포인트다. */
@Slf4j
@RestController
@RequestMapping("/api/v1/hints")
@RequiredArgsConstructor
public class HintController {

  private final HintOrchestrationService hintOrchestrationService;

  /** 현재 유저 런타임 상태를 기준으로 실시간 힌트를 생성한다. */
  @PostMapping("/live")
  public ResponseEntity<BaseResponse<HintLiveResponseDto>> liveHint(
      @AuthenticationPrincipal CustomUserPrincipal principal,
      @Valid @RequestBody HintLiveRetrieveRequestDto request) {

    HintLiveResponseDto response =
        hintOrchestrationService.generateLiveHint(principal.getUserId(), request);

    log.info(
        "Hint live generated. userId={}, phase={}, lowConfidence={}, hintLevel={}",
        principal.getUserId(),
        response.getSelectedPhase(),
        response.isLowConfidence(),
        response.getHintLevel());

    return ResponseEntity.ok(BaseResponse.success("실시간 힌트 생성 성공", response));
  }
}

