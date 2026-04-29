package com.lucas.story.service.redis;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class StorySessionRedisService {

  private static final String SESSION_KEY_PREFIX_FORMAT = "play:session:%s:";
  private static final String STATE_SUFFIX = "state";
  private static final String RECENT_EVENTS_SUFFIX = "recent_events";
  private static final String RECENT_COMMANDS_SUFFIX = "recent_commands";
  private static final String FAIL_COUNT_SUFFIX = "fail_count";
  private static final int RECENT_EVENTS_LIMIT = 20;
  private static final int RECENT_COMMANDS_LIMIT = 10;
  private static final long SESSION_TTL_HOURS = 24;

  private final RedisTemplate<String, String> redisTemplate;
  private final ObjectMapper objectMapper;

  public void recordAction(
      String sessionId, StorySessionState state, StoryRecentEvent recentEvent) {
    if (sessionId == null || sessionId.isBlank()) {
      return;
    }

    String stateKey = resolveSessionKey(sessionId, STATE_SUFFIX);
    String recentEventsKey = resolveSessionKey(sessionId, RECENT_EVENTS_SUFFIX);
    String recentCommandsKey = resolveSessionKey(sessionId, RECENT_COMMANDS_SUFFIX);

    try {
      redisTemplate
          .opsForHash()
          .putAll(
              stateKey,
              Map.of(
                  "user_id", String.valueOf(state.userId()),
                  "chapter_id", safeString(state.chapterId()),
                  "current_node_id", safeString(state.currentNodeId()),
                  "state_version", String.valueOf(state.stateVersion())));

      String recentEventJson = objectMapper.writeValueAsString(recentEvent);
      redisTemplate.opsForList().leftPush(recentEventsKey, recentEventJson);
      redisTemplate.opsForList().trim(recentEventsKey, 0, RECENT_EVENTS_LIMIT - 1);

      if ("command".equals(recentEvent.actionType())) {
        redisTemplate
            .opsForList()
            .leftPush(recentCommandsKey, safeString(recentEvent.inputValueNorm()));
        redisTemplate.opsForList().trim(recentCommandsKey, 0, RECENT_COMMANDS_LIMIT - 1);
        redisTemplate.expire(recentCommandsKey, SESSION_TTL_HOURS, TimeUnit.HOURS);
      }

      redisTemplate.expire(stateKey, SESSION_TTL_HOURS, TimeUnit.HOURS);
      redisTemplate.expire(recentEventsKey, SESSION_TTL_HOURS, TimeUnit.HOURS);
    } catch (JsonProcessingException e) {
      log.warn("StorySessionRedisService: failed to serialize recent event: {}", e.getMessage());
    } catch (Exception e) {
      log.warn("StorySessionRedisService: failed to record session action: {}", e.getMessage());
    }
  }

  public java.util.List<String> getRecentCommands(String sessionId) {
    String recentCommandsKey = resolveSessionKey(sessionId, RECENT_COMMANDS_SUFFIX);
    return redisTemplate.opsForList().range(recentCommandsKey, 0, RECENT_COMMANDS_LIMIT - 1);
  }

  /**
   * 세션 state hash를 조회합니다.
   *
   * @param sessionId 세션 ID
   * @return Redis hash의 문자열 맵 (없으면 빈 맵)
   */
  public Map<Object, Object> getSessionState(String sessionId) {
    if (sessionId == null || sessionId.isBlank()) {
      return Collections.emptyMap();
    }
    String stateKey = resolveSessionKey(sessionId, STATE_SUFFIX);
    Map<Object, Object> state = redisTemplate.opsForHash().entries(stateKey);
    return state != null ? state : Collections.emptyMap();
  }

  /**
   * 세션 최근 이벤트를 조회합니다.
   *
   * @param sessionId 세션 ID
   * @param limit 조회 개수
   * @return 최신순 StoryRecentEvent 목록
   */
  public List<StoryRecentEvent> getRecentEvents(String sessionId, int limit) {
    if (sessionId == null || sessionId.isBlank() || limit <= 0) {
      return List.of();
    }

    String key = resolveSessionKey(sessionId, RECENT_EVENTS_SUFFIX);
    List<String> rows = redisTemplate.opsForList().range(key, 0, limit - 1);
    if (rows == null || rows.isEmpty()) {
      return List.of();
    }

    List<StoryRecentEvent> events = new ArrayList<>();
    for (String row : rows) {
      if (row == null || row.isBlank()) {
        continue;
      }
      try {
        StoryRecentEvent event = objectMapper.readValue(row, StoryRecentEvent.class);
        events.add(event);
      } catch (Exception e) {
        log.warn("StorySessionRedisService: failed to parse recent event row: {}", e.getMessage());
      }
    }
    return events;
  }

  /**
   * 세션 fail_count 값을 조회합니다.
   *
   * @param sessionId 세션 ID
   * @return fail_count 정수값 (없거나 파싱 실패 시 0)
   */
  public int getFailCount(String sessionId) {
    if (sessionId == null || sessionId.isBlank()) {
      return 0;
    }

    String key = resolveSessionKey(sessionId, FAIL_COUNT_SUFFIX);
    String value = redisTemplate.opsForValue().get(key);
    if (value == null || value.isBlank()) {
      return 0;
    }
    try {
      return Integer.parseInt(value);
    } catch (NumberFormatException e) {
      log.warn("StorySessionRedisService: invalid fail_count value: {}", value);
      return 0;
    }
  }

  private String resolveSessionKey(String sessionId, String suffix) {
    return String.format(SESSION_KEY_PREFIX_FORMAT, sessionId) + suffix;
  }

  private String safeString(String value) {
    return value == null ? "" : value;
  }
}
