package com.lucas.story.service.logging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StoryActionLogService {

  // 이 값은 ELK Logstash 파이프라인에서 필터링하는 대상입니다. (if [logger_name] == "StoryActionLogger")
  private static final Logger actionLogger = LoggerFactory.getLogger("StoryActionLogger");
  private static final Logger log = LoggerFactory.getLogger(StoryActionLogService.class);

  private final ObjectMapper objectMapper;
  private final RedisTemplate<String, String> redisTemplate;

  // Session 기반 Fail Count Redis Key
  private static final String FAIL_COUNT_KEY_FORMAT = "play:session:%s:fail_count";
  private static final long FAIL_COUNT_TTL_MINUTES = 10;

  /** 액션 로깅 DTO를 JSON 형태로 직렬화하여 logger를 통해 출력합니다. */
  public void logAction(StoryActionLogEvent event) {
    try {
      // 한 줄의 순수 JSON 포맷 유지를 위해 writeValueAsString 사용
      String jsonLog = objectMapper.writeValueAsString(event);
      actionLogger.info(jsonLog);
    } catch (JsonProcessingException e) {
      log.error("Failed to serialize StoryActionLogEvent", e);
    }
  }

  /** 집계용 input_value_norm 생성기 (trim, lowercase, 1개 공백 정리) */
  public String normalizeInputValue(String raw) {
    if (raw == null) {
      return null;
    }
    return raw.trim().toLowerCase().replaceAll("\\s+", " ");
  }

  /** ISO-8601 UTC 포맷 Timestamp 생성 */
  public String generateTimestamp() {
    return Instant.now().atOffset(ZoneOffset.UTC).format(DateTimeFormatter.ISO_INSTANT);
  }

  /** Redis를 활용한 fail_count 갱신/가져오기 기능 */
  public int updateAndGetFailCount(String sessionId, boolean isFail) {
    return updateAndGetFailCount(sessionId, isFail, true);
  }

  /**
   * Redis를 활용한 fail_count 갱신/가져오기 기능
   *
   * @param resetOnSuccess true면 성공 시 fail_count를 0으로 초기화한다.
   */
  public int updateAndGetFailCount(String sessionId, boolean isFail, boolean resetOnSuccess) {
    if (sessionId == null || sessionId.isEmpty()) {
      return isFail ? 1 : 0;
    }

    String key = String.format(FAIL_COUNT_KEY_FORMAT, sessionId);
    try {
      if (isFail) {
        Long count = redisTemplate.opsForValue().increment(key);
        redisTemplate.expire(key, FAIL_COUNT_TTL_MINUTES, TimeUnit.MINUTES);
        return count != null ? count.intValue() : 1;
      } else {
        if (resetOnSuccess) {
          redisTemplate.delete(key);
          return 0;
        }
        redisTemplate.expire(key, FAIL_COUNT_TTL_MINUTES, TimeUnit.MINUTES);
        String current = redisTemplate.opsForValue().get(key);
        if (current == null || current.isBlank()) {
          return 0;
        }
        try {
          return Integer.parseInt(current);
        } catch (NumberFormatException ignored) {
          return 0;
        }
      }
    } catch (Exception e) {
      log.warn(
          "StoryActionLogService: Redis fail_count 실패 => session: {}, error: {}",
          sessionId,
          e.getMessage());
      return isFail ? 1 : 0;
    }
  }
}
