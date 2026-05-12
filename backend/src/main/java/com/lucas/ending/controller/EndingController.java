package com.lucas.ending.controller;

import com.lucas.auth.principal.CustomUserPrincipal;
import com.lucas.ending.dto.response.EndingProgressResponse;
import com.lucas.ending.dto.response.EndingResultSceneResponse;
import com.lucas.ending.dto.response.EndingTitleSceneResponse;
import com.lucas.ending.service.EndingService;
import com.lucas.global.dto.BaseResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 엔딩 진행도 조회 API 컨트롤러입니다.
 *
 * <p>플레이어의 엔딩 분기 신호와 전체 달성 타이틀 연출 가능 여부를 프론트엔드에 전달합니다.
 *
 * @see EndingService
 */
@RestController
@RequestMapping("/api/v1/endings")
@RequiredArgsConstructor
public class EndingController {

  /** 엔딩 저장 및 진행도 집계 비즈니스 로직을 담당하는 서비스입니다. */
  private final EndingService endingService;

  /**
   * 현재 인증된 사용자의 엔딩 진행도를 조회합니다.
   *
   * @param principal JWT 인증 필터에서 주입한 현재 사용자 principal
   * @return 하나 이상 획득 여부와 전체 달성 여부를 담은 공통 응답
   */
  @GetMapping
  public BaseResponse<EndingProgressResponse> getEndingProgress(
      @AuthenticationPrincipal CustomUserPrincipal principal) {
    // principal의 userId 기준으로 사용자별 엔딩 진행도를 조회합니다.
    EndingProgressResponse response = endingService.getEndingProgress(principal.getUserId());

    // 프로젝트 공통 응답 포맷으로 감싸 프론트엔드와 일관된 API 계약을 유지합니다.
    return BaseResponse.success("Ending progress fetched", response);
  }

  /**
   * 엔딩 결과 화면에 표시할 문구를 조회합니다.
   *
   * @param principal JWT 인증 필터에서 주입한 현재 사용자 principal
   * @param endingType 현재 도달한 엔딩 타입
   * @return 해금 상태를 통과한 사용자에게만 제공되는 엔딩 결과 화면 문구
   */
  @GetMapping("/result-scene")
  public BaseResponse<EndingResultSceneResponse> getEndingResultScene(
      @AuthenticationPrincipal CustomUserPrincipal principal, @RequestParam String endingType) {
    // 엔딩 문구 노출 조건은 서비스 계층에서 사용자 해금 상태를 기준으로 검증합니다.
    EndingResultSceneResponse response =
        endingService.getEndingResultScene(principal.getUserId(), endingType);

    // 프론트엔드는 이 응답의 문구를 그대로 렌더링하고, 정적 번들에는 결과 문구를 포함하지 않습니다.
    return BaseResponse.success("Ending result scene fetched", response);
  }

  /**
   * 전체 엔딩 달성 후 타이틀 화면 연출 정보를 조회합니다.
   *
   * @param principal JWT 인증 필터에서 주입한 현재 사용자 principal
   * @return 전체 엔딩 달성 사용자에게만 제공되는 타이틀 영상 정보
   */
  @GetMapping("/title-scene")
  public BaseResponse<EndingTitleSceneResponse> getEndingTitleScene(
      @AuthenticationPrincipal CustomUserPrincipal principal) {
    // 전체 엔딩 달성 검증과 영상 URL 선택은 서비스 계층에서 처리합니다.
    EndingTitleSceneResponse response =
        endingService.getCompleteArchiveTitleScene(principal.getUserId());

    // 프론트엔드는 이 응답을 받은 경우에만 타이틀 배경 영상을 렌더링합니다.
    return BaseResponse.success("Ending title scene fetched", response);
  }
}
