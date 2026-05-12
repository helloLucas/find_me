package com.lucas.ending.dto.response;

import lombok.Builder;
import lombok.Getter;

/**
 * 사용자 엔딩 진행도 조회 응답 DTO입니다.
 *
 * <p>프론트엔드는 이 응답을 사용해 다른 엔딩 분기 신호와 모든 엔딩 달성 타이틀 연출 여부만 결정합니다.
 */
@Getter
@Builder
public class EndingProgressResponse {

  /** 현재 사용자가 하나 이상의 엔딩을 해금했는지 여부입니다. */
  private boolean hasUnlockedEnding;

  /** 모든 엔딩 타입을 한 번 이상 해금했는지 여부입니다. */
  private boolean allUnlocked;
}
