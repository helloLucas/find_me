package com.lucas.chapter.service;

import com.lucas.chapter.dto.response.ChapterProgressResponse;
import com.lucas.chapter.entity.Chapter;
import com.lucas.chapter.repository.ChapterRepository;
import com.lucas.progress.entity.UserChapterProgress;
import com.lucas.progress.repository.UserChapterProgressRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
    // 1. 배포된 챕터 목록 조회 및 Map 변환
    List<Chapter> publishedChapters = chapterRepository.findAll();
    Map<String, Chapter> chapterMap =
        publishedChapters.stream().collect(Collectors.toMap(Chapter::getCode, chapter -> chapter));

    // 2. 유저의 전체 진행 상태를 한 번에 조회하여 Map으로 구성
    List<UserChapterProgress> userProgressList =
        userChapterProgressRepository.findAllByUserId(userId);
    Map<Long, UserChapterProgress> progressMap =
        userProgressList.stream()
            .collect(
                Collectors.toMap(progress -> progress.getChapter().getId(), progress -> progress));

    List<ChapterProgressResponse> result = new ArrayList<>();

    for (String code : FIXED_CHAPTER_CODES) {
      Chapter chapter = chapterMap.get(code);

      // 미배포 챕터: DB에 챕터 정보가 없거나 isPublished가 false인 경우
      if (chapter == null || !chapter.getIsPublished()) {
        result.add(ChapterProgressResponse.of(code, "Unknown", "DISABLED"));
        continue;
      }

      // 챕터가 존재할 경우, 유저의 진행 상태 확인
      UserChapterProgress progress = progressMap.get(chapter.getId());
      String currentStatus;

      if (progress != null) {
        // 유저 진행 상태 레코드가 존재함 (UNLOCKED 또는 COMPLETED)
        // 이전 챕터를 클리어하여 데이터가 생성되었거나, 이미 완료한 상태
        currentStatus = progress.getStatus().name();
      } else {
        // 유저 진행 상태 레코드가 없음
        // 다음 챕터 해금 시 레코드가 생성되어야 하므로, 데이터가 없다는 것은 아직 도달하지 못한 챕터임을 의미 (LOCKED)
        // 단, 첫 챕터(week01)는 이전 챕터가 없으므로 데이터가 없더라도 기본적으로 UNLOCKED 처리
        if (FIXED_CHAPTER_CODES.get(0).equals(code)) {
          currentStatus = "UNLOCKED";
        } else {
          currentStatus = "LOCKED";
        }
      }

      result.add(ChapterProgressResponse.of(chapter.getCode(), chapter.getTitle(), currentStatus));
    }

    return result;
  }
}
