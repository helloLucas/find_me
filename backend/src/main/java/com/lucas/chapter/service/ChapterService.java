package com.lucas.chapter.service;

import com.lucas.chapter.dto.response.ChapterProgressResponse;
import java.util.List;

/**
 * 챕터 목록 조회와 사용자별 챕터 진행 상태 계산을 담당하는 서비스 계약입니다.
 *
 * <p>컨트롤러는 구현체가 아니라 이 인터페이스에 의존합니다. 실제 로비 해금 보정 로직은 {@link ChapterServiceImpl}에서 처리합니다.
 */
public interface ChapterService {

  /**
   * 로그인한 사용자의 로비 챕터 상태 목록을 조회합니다.
   *
   * <p>응답은 프론트엔드 로비가 고정 슬롯으로 표시하는 week01 ~ week04 순서를 따릅니다. 구현체는 챕터 배포 여부와 사용자 진행 데이터를 함께 확인하여
   * DISABLED, LOCKED, UNLOCKED, COMPLETED 중 하나의 상태를 계산합니다.
   *
   * <p>이전 챕터를 이미 완료했지만 다음 챕터 progress가 없던 과거 사용자도 로비 진입 시점에 보정될 수 있습니다.
   *
   * @param userId 로그인한/게스트의 유저 ID
   * @return 챕터 상태 목록. 각 항목은 챕터 코드, 제목, 화면 노출용 상태를 포함합니다.
   */
  List<ChapterProgressResponse> getChapterProgressList(Long userId);
}
