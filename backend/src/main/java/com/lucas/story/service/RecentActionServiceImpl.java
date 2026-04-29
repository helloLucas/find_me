package com.lucas.story.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lucas.story.dto.redis.RecentActionEvent;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/** Redis List/Hash를 사용해 최근 행동 로그와 힌트용 현재 context를 관리하는 서비스 구현체입니다. */
@Service
@Slf4j
@RequiredArgsConstructor
public class RecentActionServiceImpl implements RecentActionService {

  private static final String RECENT_ACTIONS_KEY_PREFIX = "story:recent-actions:";
  private static final String CONTEXT_KEY_PREFIX = "story:context:";
  private static final int MAX_RECENT_ACTIONS = 50;
  private static final long EXPIRATION_HOURS = 24;

  private final RedisTemplate<String, String> redisTemplate;
  private final ObjectMapper objectMapper;

  /**
   * transition 처리 결과를 Redis recent-actions list와 context hash에 저장합니다.
   *
   * <p>Redis 장애가 스토리 진행을 막지 않도록 모든 예외는 로그만 남기고 삼킵니다.
   *
   * @param event 저장할 최근 행동 이벤트
   */
  @Override
  public void recordAction(RecentActionEvent event) {
    // 이벤트가 저장 가능한 최소 식별자를 갖추었는지 먼저 확인한다.
    if (!isRecordable(event)) {
      // 저장할 수 없는 이벤트는 Redis 명령을 보내지 않고 조용히 종료한다.
      return;
    }

    try {
      // 모든 Redis 기록에 동일한 시각을 쓰기 위해 현재 시각을 한 번만 만든다.
      String recordedAt = OffsetDateTime.now().toString();

      // 유저와 챕터를 기준으로 최근 행동 List key를 만든다.
      String recentActionsKey = buildRecentActionsKey(event.getUserId(), event.getChapterCode());

      // 유저와 챕터를 기준으로 현재 context Hash key를 만든다.
      String contextKey = buildContextKey(event.getUserId(), event.getChapterCode());

      // Redis List에 넣을 JSON 문자열을 생성한다.
      String payload = serializeRecentAction(event, recordedAt);

      // 최신 행동이 앞에 오도록 List의 왼쪽에 payload를 추가한다.
      redisTemplate.opsForList().leftPush(recentActionsKey, payload);

      // 힌트 생성에 필요한 최근 행동만 유지하도록 List 길이를 제한한다.
      redisTemplate.opsForList().trim(recentActionsKey, 0, MAX_RECENT_ACTIONS - 1);

      // 진행 세션이 오래 방치되면 자동 정리되도록 List TTL을 갱신한다.
      redisTemplate.expire(recentActionsKey, EXPIRATION_HOURS, TimeUnit.HOURS);

      // 힌트 생성에서 빠르게 참고할 현재 context 값을 만든다.
      Map<String, String> context = buildContext(event, recordedAt);

      // 비어 있지 않은 context만 Redis Hash에 반영한다.
      if (!context.isEmpty()) {
        // 현재 node/cwd/result 등 최신 요약값을 Hash에 덮어쓴다.
        redisTemplate.opsForHash().putAll(contextKey, context);

        // context도 recent-actions와 동일한 생명주기로 만료시킨다.
        redisTemplate.expire(contextKey, EXPIRATION_HOURS, TimeUnit.HOURS);
      }

      // 정상 저장 여부를 운영 로그에서 추적할 수 있도록 요약 로그를 남긴다.
      log.info(
          "Recorded recent action to Redis. userId={}, chapterCode={}, result={}",
          event.getUserId(),
          event.getChapterCode(),
          event.getResult());
    } catch (Exception e) {
      // Redis 실패가 게임 진행 실패로 전파되지 않도록 예외를 삼키고 로그만 남긴다.
      log.error(
          "Failed to record recent action. userId={}, chapterCode={}",
          event != null ? event.getUserId() : null,
          event != null ? event.getChapterCode() : null,
          e);
    }
  }

  /**
   * Redis에 저장 가능한 최소 필수 필드가 있는지 확인합니다.
   *
   * @param event 저장 후보 이벤트
   * @return userId와 chapterCode가 모두 있으면 true
   */
  private boolean isRecordable(RecentActionEvent event) {
    // 이벤트 객체가 없으면 어떤 key도 만들 수 없으므로 저장하지 않는다.
    if (event == null) {
      // null 이벤트는 저장 불가로 판단한다.
      return false;
    }

    // userId가 없으면 사용자별 Redis key를 만들 수 없으므로 저장하지 않는다.
    if (event.getUserId() == null) {
      // userId 누락 이벤트는 저장 불가로 판단한다.
      return false;
    }

    // chapterCode가 비어 있으면 챕터별 recent-actions key를 만들 수 없으므로 저장하지 않는다.
    return event.getChapterCode() != null && !event.getChapterCode().isBlank();
  }

  /**
   * 최근 행동 Redis List key를 생성합니다.
   *
   * @param userId 사용자 식별자
   * @param chapterCode 챕터 코드
   * @return story:recent-actions:{userId}:{chapterCode} 형식의 key
   */
  private String buildRecentActionsKey(Long userId, String chapterCode) {
    // 문서에서 확정한 recent-actions namespace를 그대로 사용한다.
    return RECENT_ACTIONS_KEY_PREFIX + userId + ":" + chapterCode;
  }

  /**
   * 힌트용 현재 context Redis Hash key를 생성합니다.
   *
   * @param userId 사용자 식별자
   * @param chapterCode 챕터 코드
   * @return story:context:{userId}:{chapterCode} 형식의 key
   */
  private String buildContextKey(Long userId, String chapterCode) {
    // 문서에서 확정한 context namespace를 그대로 사용한다.
    return CONTEXT_KEY_PREFIX + userId + ":" + chapterCode;
  }

  /**
   * Redis List에 저장할 최근 행동 JSON 문자열을 생성합니다.
   *
   * @param event 저장할 최근 행동 이벤트
   * @param recordedAt 저장 시각 문자열
   * @return JSON 직렬화 문자열
   * @throws Exception ObjectMapper 직렬화 실패 시 발생
   */
  private String serializeRecentAction(RecentActionEvent event, String recordedAt)
      throws Exception {
    // 명시적인 필드 순서를 유지하기 위해 ObjectNode를 직접 구성한다.
    ObjectNode payload = objectMapper.createObjectNode();

    // 최근 행동이 발생한 챕터를 저장한다.
    putText(payload, "chapterCode", event.getChapterCode());

    // 최근 행동이 발생한 출발 노드를 저장한다.
    putText(payload, "nodeCode", event.getNodeCode());

    // 스토리 이동이 있었다면 도착 노드를 저장한다.
    putText(payload, "toNodeCode", event.getToNodeCode());

    // command/click/inspect/system 같은 행동 타입을 저장한다.
    putText(payload, "actionType", event.getActionType());

    // 사용자가 입력한 값을 저장한다.
    putText(payload, "input", event.getInput());

    // transition 처리 결과 코드를 저장한다.
    putText(payload, "result", event.getResult());

    // 가상 터미널의 현재 경로가 있으면 저장한다.
    putText(payload, "cwd", event.getCwd());

    // snapshotVersion이 있으면 숫자로 저장한다.
    putNumber(payload, "snapshotVersion", event.getSnapshotVersion());

    // scanPercent가 있으면 숫자로 저장한다.
    putNumber(payload, "scanPercent", event.getScanPercent());

    // Redis에 기록한 시각을 저장한다.
    putText(payload, "at", recordedAt);

    // RedisTemplate<String, String>에 저장할 수 있도록 JSON 문자열로 변환한다.
    return objectMapper.writeValueAsString(payload);
  }

  /**
   * Redis Hash에 반영할 현재 context 필드 Map을 생성합니다.
   *
   * @param event 저장할 최근 행동 이벤트
   * @param recordedAt 저장 시각 문자열
   * @return null 값을 제외한 context 필드 Map
   */
  private Map<String, String> buildContext(RecentActionEvent event, String recordedAt) {
    // Redis Hash field 순서를 예측 가능하게 유지하기 위해 LinkedHashMap을 사용한다.
    Map<String, String> context = new LinkedHashMap<>();

    // 현재 노드는 도착 노드가 있으면 도착 노드를 우선 사용한다.
    String currentNodeCode =
        event.getToNodeCode() != null ? event.getToNodeCode() : event.getNodeCode();

    // 현재 노드 코드가 있으면 context에 저장한다.
    putContext(context, "nodeCode", currentNodeCode);

    // 현재 cwd가 있으면 context에 저장한다.
    putContext(context, "cwd", event.getCwd());

    // snapshotVersion이 있으면 문자열로 변환해 context에 저장한다.
    putContext(context, "snapshotVersion", toStringOrNull(event.getSnapshotVersion()));

    // scanPercent가 있으면 문자열로 변환해 context에 저장한다.
    putContext(context, "scanPercent", toStringOrNull(event.getScanPercent()));

    // 마지막 처리 결과가 있으면 context에 저장한다.
    putContext(context, "lastResult", event.getResult());

    // context 갱신 시각을 저장한다.
    putContext(context, "updatedAt", recordedAt);

    // 구성된 context Map을 반환한다.
    return context;
  }

  /**
   * 값이 있을 때만 ObjectNode에 문자열 필드를 추가합니다.
   *
   * @param node 값을 추가할 JSON node
   * @param fieldName JSON 필드명
   * @param value 저장할 문자열 값
   */
  private void putText(ObjectNode node, String fieldName, String value) {
    // null 값은 recent-actions JSON에서 생략한다.
    if (value == null) {
      // 저장할 값이 없으므로 아무 작업도 하지 않는다.
      return;
    }

    // 빈 문자열도 의미 있는 입력일 수 있으므로 null이 아니면 그대로 저장한다.
    node.put(fieldName, value);
  }

  /**
   * 값이 있을 때만 ObjectNode에 숫자 필드를 추가합니다.
   *
   * @param node 값을 추가할 JSON node
   * @param fieldName JSON 필드명
   * @param value 저장할 숫자 값
   */
  private void putNumber(ObjectNode node, String fieldName, Integer value) {
    // null 값은 recent-actions JSON에서 생략한다.
    if (value == null) {
      // 저장할 값이 없으므로 아무 작업도 하지 않는다.
      return;
    }

    // 숫자 필드는 JSON number 타입으로 저장한다.
    node.put(fieldName, value);
  }

  /**
   * 값이 있을 때만 Redis Hash context Map에 필드를 추가합니다.
   *
   * @param context 값을 추가할 context Map
   * @param fieldName Redis Hash 필드명
   * @param value 저장할 문자열 값
   */
  private void putContext(Map<String, String> context, String fieldName, String value) {
    // null 값은 context Hash에서 생략한다.
    if (value == null) {
      // 저장할 값이 없으므로 아무 작업도 하지 않는다.
      return;
    }

    // 빈 문자열은 힌트 context 품질을 떨어뜨릴 수 있으므로 생략한다.
    if (value.isBlank()) {
      // 공백뿐인 값은 저장하지 않는다.
      return;
    }

    // 유효한 문자열만 Redis Hash field로 저장한다.
    context.put(fieldName, value);
  }

  /**
   * Integer 값을 Redis Hash 저장용 문자열로 변환합니다.
   *
   * @param value 변환할 숫자 값
   * @return null이면 null, 값이 있으면 문자열 표현
   */
  private String toStringOrNull(Integer value) {
    // null은 그대로 null로 유지해 상위 putContext에서 생략할 수 있게 한다.
    if (value == null) {
      // 저장할 숫자가 없으므로 null을 반환한다.
      return null;
    }

    // 숫자 값을 Redis String serializer가 처리할 수 있는 문자열로 바꾼다.
    return String.valueOf(value);
  }
}
