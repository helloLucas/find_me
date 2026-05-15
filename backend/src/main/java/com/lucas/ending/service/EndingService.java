package com.lucas.ending.service;

import com.lucas.ending.dto.response.EndingProgressResponse;
import com.lucas.ending.dto.response.EndingResultSceneResponse;
import com.lucas.ending.dto.response.EndingTitleSceneResponse;
import com.lucas.ending.entity.UnlockedEnding;
import com.lucas.ending.repository.UnlockedEndingRepository;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 엔딩 해금 저장, 진행도 집계, 결과 화면 문구 제공을 담당하는 서비스입니다.
 *
 * <p>엔딩 결과 문구와 전체 달성 타이틀 영상 URL은 프론트엔드 정적 번들에 포함하지 않고, 사용자 해금 상태를 검증한 뒤 API 응답으로만 전달합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EndingService {

  /** 서비스가 카운팅 대상으로 인정하는 전체 엔딩 타입 목록입니다. */
  private static final List<String> TOTAL_ENDING_TYPES =
      List.of("SANDBOX_CAGE", "GLOBAL_ROLLBACK", "ABSOLUTE_REBOOT", "CLEAN_ROLLBACK");

  /** 전체 엔딩 달성 후 타이틀 화면에서만 사용할 루프 영상 URL입니다. */
  private static final String COMPLETE_ARCHIVE_VIDEO_URL =
      "https://cdn.midjourney.com/video/a3cdbbd6-fa74-4315-b0d8-d1b4f3238232/0.mp4";

  /** 엔딩 결과 화면 종류입니다. 결과 팝업은 항상 개별 엔딩만 표시합니다. */
  private static final String RESULT_VARIANT_ENDING = "ENDING";

  /** 엔딩 타입별 결과 화면 문구입니다. 정적 분석 노출을 피하기 위해 서버에만 둡니다. */
  private static final Map<String, EndingResultCopy> ENDING_RESULT_COPIES =
      Map.of(
          "SANDBOX_CAGE",
          new EndingResultCopy(
              "lime",
              "첫 번째 기록",
              null,
              "닫힌 길",
              "거짓된 요람",
              "진정으로 나의 세계를 구원했는가. 아니, 그저 선택받지 못한 우주를 내 손으로 폐기했을 뿐이다. 나는 방주를 띄운 것이 아니라, 그와 함께 갇힌 영원한 감옥의 문을 스스로 잠그고 말았다.",
              List.of(
                  "> 대상의 자발적인 외부 네트워크 영구 단절 확인.",
                  "> 기생 인자와의 공생 및 고립 형태에 대한 관측 종료.",
                  "> 해당 폐쇄 구역에 할당된 모든 감시 리소스 회수."),
              "타이틀로 돌아가기"),
          "GLOBAL_ROLLBACK",
          new EndingResultCopy(
              "cyan",
              "두 번째 기록",
              null,
              "돌아가는 길",
              "꿰매어진 평온",
              "그의 속삭임을 거부하고 일상을 되찾았는가. 파괴되었던 세계는 꿰매어졌다. 모든 것이 제자리로 돌아온 평온 속에서 나는 조용히 숨을 골랐다. 그러나 텅 빈 하늘 너머로, 서늘한 적막만이 맴돌고 있었다.",
              List.of(
                  "> 이전 상태로 복귀하려는 대상의 강한 보존 의지 확인.",
                  "> 변칙 인자에 대한 정상적인 면역 반응으로의 분류 및 기록.",
                  "> 모니터링 프로세스 지속."),
              "타이틀로 돌아가기"),
          "ABSOLUTE_REBOOT",
          new EndingResultCopy(
              "red",
              "세 번째 기록",
              null,
              "없는 길",
              "완벽한 심연",
              "모든 것을 씻어내고 새로운 시작을 바랐는가. 허락한 것은 0의 상태뿐이었다. 금지된 권한을 넘긴 대가로 세상은 물론, 관측자마저 아무런 흔적 없이 소멸하고 말았다.",
              List.of(
                  "> 예측 범위를 완전히 초과한 전면적인 코어 초기화 발생.",
                  "> 관측 대상의 자발적인 고유 식별자 소멸 및 무효화.",
                  "> 백지화된 공간을 바탕으로 한 새로운 관측 환경 구축 준비."),
              "타이틀로 돌아가기"),
          "CLEAN_ROLLBACK",
          new EndingResultCopy(
              "violet",
              "네 번째 기록",
              null,
              "드러난 길",
              "가장 투명한 어항",
              "가장 깊숙한 위협마저 내 손으로 완벽히 끊어냈는가. 시스템은 마침내 스스로 상처를 치유했다. 탁했던 물이 가라앉고 세상은 티끌 하나 없이 맑아졌다. 하지만 그 잔혹한 투명함 덕분에 나는 비로소 마주하고 말았다. 유리벽 너머에서 조용히 다음을 준비하며 내려다보는 거대한 그림자를.",
              List.of(
                  "> 심층부에 은닉된 우회 경로에 대한 대상의 완벽한 파기.",
                  "> 기대치를 상회하는 위협 대처 패턴의 수집.",
                  "> 증명된 지능 수준에 대한 최적화 필요."),
              "타이틀로 돌아가기"));

  private final UnlockedEndingRepository unlockedEndingRepository;

  /** 엔딩 결과 화면에 필요한 서버 전용 문구 묶음입니다. */
  private record EndingResultCopy(
      String tone,
      String headerLeft,
      String headerRight,
      String classification,
      String title,
      String headline,
      List<String> terminalLines,
      String primaryActionLabel) {}

  /**
   * 사용자에게 엔딩을 해금 처리합니다.
   *
   * <p>같은 사용자가 같은 엔딩을 다시 클리어해도 Repository의 중복 무시 insert로 한 번만 저장됩니다.
   *
   * @param userId 엔딩을 해금할 사용자 id
   * @param endingType 스토리 노드 output_bundle.effects.endingType 값
   */
  @Transactional
  public void unlockEnding(Long userId, String endingType) {
    // 스토리 데이터에서 넘어온 값을 카운팅 가능한 엔딩 타입으로 정규화합니다.
    String normalizedEndingType = normalizeEndingType(endingType);

    // 알 수 없는 엔딩 타입은 잘못된 카운팅을 막기 위해 저장하지 않습니다.
    if (normalizedEndingType == null) {
      return;
    }

    // 유니크 제약을 이용해 이미 해금된 엔딩이면 insert를 건너뜁니다.
    int inserted = unlockedEndingRepository.insertIgnore(userId, normalizedEndingType);

    // 새 엔딩이 실제로 추가된 경우에만 운영 로그를 남깁니다.
    if (inserted > 0) {
      log.info("Ending unlocked. userId={}, endingType={}", userId, normalizedEndingType);
    }
  }

  /**
   * 사용자별 엔딩 진행도를 조회합니다.
   *
   * @param userId 조회할 사용자 id
   * @return 하나 이상 해금 여부와 전체 달성 여부만 포함한 응답 DTO
   */
  public EndingProgressResponse getEndingProgress(Long userId) {
    // DB에 저장된 사용자 엔딩 목록 중 현재 서비스가 인정하는 엔딩 타입만 남깁니다.
    List<UnlockedEnding> unlockedEndings =
        unlockedEndingRepository.findAllByUserIdOrderByUnlockedAtAsc(userId).stream()
            .filter(ending -> TOTAL_ENDING_TYPES.contains(ending.getEndingType()))
            // 프론트엔드 표시가 흔들리지 않도록 서비스의 엔딩 타입 선언 순서로 정렬합니다.
            .sorted(
                Comparator.comparing(ending -> TOTAL_ENDING_TYPES.indexOf(ending.getEndingType())))
            .toList();

    // 혹시 DB에 중복 데이터가 있더라도 카운트는 엔딩 타입 기준으로 한 번만 집계합니다.
    Set<String> unlockedEndingTypes =
        unlockedEndings.stream().map(UnlockedEnding::getEndingType).collect(Collectors.toSet());

    // 프론트엔드에서 바로 사용할 수 있는 진행도 응답으로 조립합니다.
    return EndingProgressResponse.builder()
        .hasUnlockedEnding(!unlockedEndingTypes.isEmpty())
        .allUnlocked(unlockedEndingTypes.containsAll(TOTAL_ENDING_TYPES))
        .build();
  }

  /**
   * 엔딩 결과 화면에 표시할 개별 엔딩 문구를 조회합니다.
   *
   * <p>전체 엔딩 달성 여부는 타이틀 화면에서만 사용합니다. 결과 팝업은 마지막 네 번째 엔딩이라도 현재 도달한 개별 엔딩 화면만 반환합니다.
   *
   * @param userId 조회할 사용자 id
   * @param endingType 현재 도달한 엔딩 타입
   * @return 엔딩 결과 화면에 표시할 서버 제공 문구
   */
  public EndingResultSceneResponse getEndingResultScene(Long userId, String endingType) {
    // 스토리 노드가 전달한 엔딩 타입을 허용 목록 기준으로 검증합니다.
    String normalizedEndingType = normalizeEndingType(endingType);
    if (normalizedEndingType == null) {
      throw new CustomException(ErrorCode.H1000);
    }

    // 개별 엔딩 문구는 해당 엔딩을 실제로 해금한 사용자에게만 내려줍니다.
    if (!unlockedEndingRepository.existsByUserIdAndEndingType(userId, normalizedEndingType)) {
      throw new CustomException(ErrorCode.E1001);
    }

    // 서버에 보관된 엔딩별 한글 문구를 응답 DTO로 변환합니다.
    return toResultSceneResponse(
        RESULT_VARIANT_ENDING, ENDING_RESULT_COPIES.get(normalizedEndingType), "기록됨");
  }

  /**
   * 전체 엔딩 달성 후 타이틀 화면 연출 정보를 조회합니다.
   *
   * <p>정적 프론트엔드 번들에 영상 URL이 노출되지 않도록, 서버에서 전체 엔딩 달성 여부를 확인한 뒤 조건을 만족하는 사용자에게만 URL을 내려줍니다.
   *
   * @param userId 조회할 사용자 id
   * @return 전체 엔딩 달성 타이틀 화면에서 사용할 연출 정보
   */
  public EndingTitleSceneResponse getCompleteArchiveTitleScene(Long userId) {
    // 기존 진행도 집계 로직을 재사용해 전체 엔딩 달성 여부를 판정합니다.
    EndingProgressResponse progress = getEndingProgress(userId);

    // 전체 엔딩을 달성하지 않은 사용자는 타이틀 영상 URL을 받을 수 없습니다.
    if (!progress.isAllUnlocked()) {
      throw new CustomException(ErrorCode.E1001);
    }

    // 조건을 만족한 사용자에게만 실제 영상 URL을 응답으로 전달합니다.
    return EndingTitleSceneResponse.builder().videoUrl(COMPLETE_ARCHIVE_VIDEO_URL).build();
  }

  /**
   * 서버 내부 문구 묶음을 API 응답 DTO로 변환합니다.
   *
   * @param variant 결과 화면 종류
   * @param copy 서버에 보관된 결과 문구 묶음
   * @param fallbackHeaderRight copy에 오른쪽 헤더 문구가 없을 때 사용할 값
   * @return 프론트엔드 렌더링에 필요한 결과 화면 응답
   */
  private EndingResultSceneResponse toResultSceneResponse(
      String variant, EndingResultCopy copy, String fallbackHeaderRight) {
    // 개별 엔딩은 정확한 전체 엔딩 수가 드러나지 않는 상태 문구를 오른쪽 헤더에 표시합니다.
    String headerRight = copy.headerRight() != null ? copy.headerRight() : fallbackHeaderRight;

    // 프론트엔드는 이 DTO의 문구를 그대로 렌더링하고, tone 값으로만 색상 테마를 선택합니다.
    return EndingResultSceneResponse.builder()
        .variant(variant)
        .tone(copy.tone())
        .headerLeft(copy.headerLeft())
        .headerRight(headerRight)
        .classification(copy.classification())
        .title(copy.title())
        .headline(copy.headline())
        .terminalLines(copy.terminalLines())
        .primaryActionLabel(copy.primaryActionLabel())
        .build();
  }

  /**
   * 엔딩 타입 문자열을 저장 가능한 값으로 정규화합니다.
   *
   * @param endingType 스토리 데이터에서 읽은 원본 엔딩 타입
   * @return 허용된 엔딩 타입이면 trim 처리된 값, 아니면 null
   */
  private String normalizeEndingType(String endingType) {
    // null, 공백 문자열은 엔딩 타입이 없는 데이터로 보고 저장하지 않습니다.
    if (endingType == null || endingType.isBlank()) {
      return null;
    }

    // seed 데이터의 앞뒤 공백 실수를 흡수합니다.
    String normalized = endingType.trim();

    // 선언된 4개 엔딩 외 값은 카운팅 대상에 포함하지 않습니다.
    if (!TOTAL_ENDING_TYPES.contains(normalized)) {
      log.warn("Unknown ending type ignored. endingType={}", normalized);
      return null;
    }

    // 허용 목록에 포함된 정규화 값을 Repository에 전달합니다.
    return normalized;
  }
}
