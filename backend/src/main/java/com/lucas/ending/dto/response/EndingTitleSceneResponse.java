package com.lucas.ending.dto.response;

import lombok.Builder;
import lombok.Getter;

/**
 * 전체 엔딩 달성 후 타이틀 화면 연출에 필요한 응답 DTO입니다.
 *
 * <p>영상 URL은 프론트엔드 정적 번들에 포함하지 않고, 전체 엔딩 달성 검증을 통과한 사용자에게만 API 응답으로 전달합니다.
 */
@Getter
@Builder
public class EndingTitleSceneResponse {

  /** 전체 엔딩 달성 후 타이틀 화면에서 루프 재생할 영상 URL입니다. */
  private String videoUrl;
}
