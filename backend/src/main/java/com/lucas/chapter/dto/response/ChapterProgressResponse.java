package com.lucas.chapter.dto.response;

import lombok.Builder;
import lombok.Getter;

/**
 * 클라이언트(프론트엔드)에 반환될 개별 챕터의 상태 정보를 담는 응답 DTO 클래스입니다.
 *
 * <p>시스템(DB)의 배포 여부와 유저의 과거 플레이 진행도를 종합한 최종 상태가 포함됩니다.
 */
@Getter
@Builder
public class ChapterProgressResponse {

  /** 챕터 식별 코드 (예: "week01") */
  private String code;

  /** 브라우저 URL 노출용 해시값 */
  private String uriHash;

  /** 화면에 노출될 챕터 제목 */
  private String title;

  /**
   * 해당 챕터의 접근 및 클리어 상태
   *
   * <ul>
   *   <li>{@code DISABLED}: 시스템에 챕터 미배포 (가장 높은 우선순위)
   *   <li>{@code LOCKED}: 배포되었으나 이전 챕터를 완료하지 못해 접근 불가
   *   <li>{@code UNLOCKED}: 접근 조건을 만족하여 플레이 가능한 상태
   *   <li>{@code COMPLETED}: 이미 클리어 완료한 상태
   * </ul>
   */
  private String status;

  public static ChapterProgressResponse of(
      String code, String uriHash, String title, String status) {
    return ChapterProgressResponse.builder()
        .code(code)
        .uriHash(uriHash)
        .title(title)
        .status(status)
        .build();
  }
}
