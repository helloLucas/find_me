package com.lucas.chapter.service;

import com.lucas.chapter.dto.response.ChapterProgressResponse;
import com.lucas.chapter.entity.Chapter;
import com.lucas.chapter.repository.ChapterRepository;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.progress.entity.ChapterStatus;
import com.lucas.progress.entity.UserChapterProgress;
import com.lucas.progress.repository.UserChapterProgressRepository;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * {@link ChapterService}의 기본 구현체입니다.
 *
 * <p>로비 화면에서 사용할 챕터 상태를 계산합니다. 단순 조회처럼 보이지만, 이전 챕터를 이미 완료한 사용자의 다음 챕터 progress가 누락되어 있으면 조회 시점에
 * 데이터를 생성하거나 LOCKED 상태를 UNLOCKED로 승격합니다.
 *
 * <p>이 보정 로직은 챕터2가 나중에 추가된 상황처럼, 과거에는 다음 챕터 데이터가 없어서 자동 생성되지 못했던 사용자 데이터를 복구하기 위해 필요합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChapterServiceImpl implements ChapterService {

  private final ChapterRepository chapterRepository;
  private final UserChapterProgressRepository userChapterProgressRepository;
  private final UserRepository userRepository;

  private static final List<String> FIXED_CHAPTER_CODES =
      List.of("week01", "week02", "week03", "week04");

  /**
   * 로비 조회 시점에 챕터 상태를 계산하고, 필요한 경우 사용자 progress를 보정합니다.
   *
   * <p>이 메서드는 progress를 생성하거나 수정할 수 있으므로 클래스 기본값인 readOnly 트랜잭션을 재정의합니다.
   *
   * @param userId 로그인한/게스트의 유저 ID
   * @return 로비에 표시할 고정 챕터 상태 목록
   */
  @Override
  @Transactional
  public List<ChapterProgressResponse> getChapterProgressList(Long userId) {
    // progress 생성 시 User 연관관계가 필요하므로, userId가 실제 사용자 ID인지 먼저 검증합니다.
    User user =
        userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.E3000));

    // 현재 DB에 등록된 모든 챕터를 조회합니다. 미배포 여부는 아래에서 isPublished로 다시 판단합니다.
    List<Chapter> chapters = chapterRepository.findAll();

    // 고정 챕터 코드(week01 ~ week04)로 빠르게 찾기 위한 맵입니다.
    Map<String, Chapter> chapterMap =
        chapters.stream().collect(Collectors.toMap(Chapter::getCode, chapter -> chapter));

    // 이전 챕터 완료 여부를 확인할 때 sortOrder - 1 챕터를 찾기 위한 맵입니다.
    Map<Integer, Chapter> chapterBySortOrder =
        chapters.stream()
            .filter(chapter -> chapter.getSortOrder() != null)
            .collect(Collectors.toMap(Chapter::getSortOrder, chapter -> chapter));

    // 사용자의 기존 챕터 진행 데이터를 한 번에 조회합니다.
    List<UserChapterProgress> userProgressList =
        userChapterProgressRepository.findAllByUserId(userId);

    // 챕터 ID 기준으로 progress를 찾기 위한 맵입니다.
    Map<Long, UserChapterProgress> progressMap =
        userProgressList.stream()
            .collect(
                Collectors.toMap(progress -> progress.getChapter().getId(), progress -> progress));

    // 프론트엔드가 기대하는 week01 ~ week04 순서대로 응답을 누적합니다.
    List<ChapterProgressResponse> result = new ArrayList<>();

    // 로비는 고정 4개 슬롯을 보여주므로, DB 조회 결과가 아니라 FIXED_CHAPTER_CODES 순회 결과를 기준으로 응답합니다.
    for (String code : FIXED_CHAPTER_CODES) {
      // 현재 슬롯 코드에 해당하는 챕터 엔티티를 찾습니다.
      Chapter chapter = chapterMap.get(code);

      // 미배포 챕터: DB에 챕터 정보가 없거나 isPublished가 false인 경우
      if (chapter == null || !Boolean.TRUE.equals(chapter.getIsPublished())) {
        // 아직 열 수 없는 챕터 슬롯은 DISABLED로 내려 프론트엔드가 비활성 상태로 표시하게 합니다.
        result.add(ChapterProgressResponse.of(code, "Unknown", "DISABLED"));
        continue;
      }

      // 배포된 챕터라면 사용자 progress가 이미 있는지 확인합니다.
      UserChapterProgress progress = progressMap.get(chapter.getId());

      // 기존 progress와 이전 챕터 완료 여부를 함께 사용해 최종 로비 상태를 계산합니다.
      ChapterStatus currentStatus =
          resolveLobbyStatus(user, chapter, progress, progressMap, chapterBySortOrder);

      // 계산된 상태를 DTO로 변환해 응답 목록에 추가합니다.
      result.add(
          ChapterProgressResponse.of(chapter.getCode(), chapter.getTitle(), currentStatus.name()));
    }

    return result;
  }

  private ChapterStatus resolveLobbyStatus(
      User user,
      Chapter chapter,
      UserChapterProgress progress,
      Map<Long, UserChapterProgress> progressMap,
      Map<Integer, Chapter> chapterBySortOrder) {
    // 현재 챕터가 로비에서 해금 가능한지 먼저 계산합니다.
    boolean unlockable = isUnlockableFromLobby(chapter, progressMap, chapterBySortOrder);

    // progress가 이미 있으면 그 레코드를 기준으로 상태를 판단합니다.
    if (progress != null) {
      // 과거에 LOCKED로 생성된 progress라도, 지금 기준으로 해금 조건을 만족하면 UNLOCKED로 승격합니다.
      if (progress.getStatus() == ChapterStatus.LOCKED && unlockable) {
        progress.unlock();
        userChapterProgressRepository.save(progress);
        return ChapterStatus.UNLOCKED;
      }

      // LOCKED 승격 대상이 아니라면 기존 상태를 그대로 반환합니다.
      return progress.getStatus();
    }

    // progress가 없고 해금 조건도 만족하지 못하면, 아직 도달하지 못한 챕터이므로 LOCKED입니다.
    if (!unlockable) {
      return ChapterStatus.LOCKED;
    }

    // progress가 없지만 해금 조건을 만족하면, 로비 조회 시점에 UNLOCKED progress를 새로 만듭니다.
    UserChapterProgress newProgress =
        UserChapterProgress.builder()
            .user(user)
            .chapter(chapter)
            .status(ChapterStatus.UNLOCKED)
            .build();

    // 새 progress를 저장해 이후 스토리 시작 API도 동일한 해금 상태를 볼 수 있게 합니다.
    userChapterProgressRepository.save(newProgress);

    // 같은 조회 흐름에서 뒤 챕터가 이 새 progress를 참조할 수 있도록 메모리 맵도 갱신합니다.
    progressMap.put(chapter.getId(), newProgress);

    // 새로 생성한 progress의 상태를 반환합니다.
    return ChapterStatus.UNLOCKED;
  }

  private boolean isUnlockableFromLobby(
      Chapter chapter,
      Map<Long, UserChapterProgress> progressMap,
      Map<Integer, Chapter> chapterBySortOrder) {
    // 해금 조건은 챕터 순서(sortOrder)를 기준으로 판단합니다.
    Integer sortOrder = chapter.getSortOrder();

    // sortOrder가 없으면 이전 챕터를 찾을 수 없으므로 보수적으로 잠금 상태로 둡니다.
    if (sortOrder == null) {
      return false;
    }

    // 첫 번째 챕터는 선행 챕터가 없으므로 배포되어 있다면 항상 해금 가능합니다.
    if (sortOrder == 1) {
      return true;
    }

    // 현재 챕터 바로 앞 순서의 챕터를 찾습니다.
    Chapter previousChapter = chapterBySortOrder.get(sortOrder - 1);

    // 이전 챕터 자체가 없으면 완료 여부를 검증할 수 없으므로 해금하지 않습니다.
    if (previousChapter == null) {
      return false;
    }

    // 이전 챕터의 사용자 progress를 확인합니다.
    UserChapterProgress previousProgress = progressMap.get(previousChapter.getId());

    // 이전 챕터 progress가 존재하고 COMPLETED일 때만 현재 챕터를 해금할 수 있습니다.
    return previousProgress != null && previousProgress.getStatus() == ChapterStatus.COMPLETED;
  }
}
