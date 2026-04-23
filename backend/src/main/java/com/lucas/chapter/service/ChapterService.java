package com.lucas.chapter.service;

import com.lucas.chapter.dto.response.ChapterProgressResponse;
import com.lucas.chapter.entity.Chapter;
import com.lucas.chapter.repository.ChapterRepository;
import com.lucas.progress.entity.ChapterStatus;
import com.lucas.progress.entity.UserChapterProgress;
import com.lucas.progress.repository.UserChapterProgressRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 챕터(Chapter) 데이터 및 유저의 챕터 진행 상태(Progress)와 관련된 비즈니스 로직을 처리하는 서비스 클래스입니다.
 *
 * <p>시스템에 등록된 챕터 배포 여부 및 유저의 종속적 클리어 조건을 종합하여 화면 노출용 상태를 계산합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChapterService {

  private final ChapterRepository chapterRepository;
  private final UserChapterProgressRepository userChapterProgressRepository;

  private static final List<String> FIXED_CHAPTER_CODES =
      List.of("week01", "week02", "week03", "week04");

  /**
   * 해당 유저의 챕터(week01 ~ week04) 목록 및 진행/활성화 상태를 리턴합니다.
   *
   * @param userId 로그인한/게스트의 유저 ID
   * @return 챕터 상태 목록 (항상 4개)
   */
  public List<ChapterProgressResponse> getChapterProgressList(Long userId) {
    // 1. 배포된 챕터(DB에 존재하는 챕터) 목록을 가져옵니다.
    List<Chapter> publishedChapters = chapterRepository.findAll();

    // 코드별로 쉽게 접근하기 위한 Map
    Map<String, Chapter> chapterMap =
        publishedChapters.stream().collect(Collectors.toMap(Chapter::getCode, chapter -> chapter));

    List<ChapterProgressResponse> result = new ArrayList<>();

    // 조건 3 (이전 챕터 완료 검증)을 위한 직전 챕터 진행상태 추적
    // week01은 이전 챕터 조건이 필요 없으나 로직 통일성을 위해 초기값을 true 로 설정
    boolean isPreviousChapterCompletedOrNull = true;

    // 화면엔 고정으로 week01 ~ week04가 노출되어야 합니다 (기본 노출 요건)
    for (int i = 0; i < FIXED_CHAPTER_CODES.size(); i++) {
      String code = FIXED_CHAPTER_CODES.get(i);
      Chapter chapter = chapterMap.get(code);

      // 1. 미배포 챕터: DB에 코드가 없음
      if (chapter == null) {
        result.add(ChapterProgressResponse.of(code, "Unknown", "DISABLED"));
        // 현재 챕터가 미배포이므로, 다음 챕터도 해금 불가능
        isPreviousChapterCompletedOrNull = false;
        continue;
      }

      // 해당 챕터의 유저 진행 상태 조회
      Optional<UserChapterProgress> progressOpt =
          userChapterProgressRepository.findByUserIdAndChapterId(userId, chapter.getId());

      String currentStatus;

      // 2. 유저 진행 상태가 존재(진행중이거나 클리어)하는 경우 -> 이미 활성화 상태
      if (progressOpt.isPresent()) {
        ChapterStatus status = progressOpt.get().getStatus();
        currentStatus = status.name(); // LOCKED, UNLOCKED, COMPLETED

        // 다음 챕터의 활성화 여부를 결정
        isPreviousChapterCompletedOrNull =
            (status == ChapterStatus.COMPLETED || status == ChapterStatus.UNLOCKED);

      } else {
        // 3. 유저 진행 상태가 없는 경우
        // week01이거나 이전 챕터를 클리어하여 현재 챕터가 접근 가능한 상태
        if (isPreviousChapterCompletedOrNull) {
          currentStatus = "UNLOCKED";
        } else {
          currentStatus = "LOCKED";
        }

        // 현재 진행 기록이 없으므로 당연히 완료한 것도 아님. 다음 챕터는 비활성화.
        isPreviousChapterCompletedOrNull = false;
      }

      result.add(ChapterProgressResponse.of(chapter.getCode(), chapter.getTitle(), currentStatus));
    }

    return result;
  }
}
