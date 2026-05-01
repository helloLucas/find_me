package com.lucas.chapter.controller;

import com.lucas.auth.principal.CustomUserPrincipal;
import com.lucas.chapter.dto.response.ChapterProgressResponse;
import com.lucas.chapter.service.ChapterService;
import com.lucas.global.dto.BaseResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 챕터와 관련된 클라이언트 요청을 처리하는 컨트롤러 클래스입니다.
 *
 * <p>사용자별 챕터 접근 및 진행 상태 조회 기능을 제공합니다.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/chapters")
public class ChapterController {

  private final ChapterService chapterService;

  /**
   * 인증된 사용자의 전체 챕터(week01 ~ week04) 진행 상태 목록을 조회합니다.
   *
   * @param principal 인증된 사용자 정보 (Security Context)
   * @return 고정된 4개의 챕터 정보와 각각의 접근/클리어 상태(DISABLED, LOCKED, UNLOCKED, COMPLETED) 리스트
   */
  @GetMapping
  public ResponseEntity<BaseResponse<List<ChapterProgressResponse>>> getChapterProgressList(
      @AuthenticationPrincipal CustomUserPrincipal principal) {

    Long userId = principal.getUserId();
    log.info("User ID: {} accessed chapter progress list.", userId);

    List<ChapterProgressResponse> response = chapterService.getChapterProgressList(userId);

    return ResponseEntity.ok(BaseResponse.success("챕터 목록 조회가 완료되었습니다.", response));
  }
}
