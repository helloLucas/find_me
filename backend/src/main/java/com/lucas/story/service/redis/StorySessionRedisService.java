package com.lucas.story.service.redis;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
        String normCmd = safeString(recentEvent.inputValueNorm());
        // 내부 트리거 명령어 등 괄호가 포함된 시스템성 명령어는 히스토리에 저장하지 않음
        if (!normCmd.contains("(") && !normCmd.contains(")")) {
          redisTemplate.opsForList().leftPush(recentCommandsKey, normCmd);
          redisTemplate.opsForList().trim(recentCommandsKey, 0, RECENT_COMMANDS_LIMIT - 1);
          redisTemplate.expire(recentCommandsKey, SESSION_TTL_HOURS, TimeUnit.HOURS);
        }
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

  public void clearRecentCommands(String sessionId) {
    if (sessionId == null || sessionId.isBlank()) return;
    String recentCommandsKey = resolveSessionKey(sessionId, RECENT_COMMANDS_SUFFIX);
    redisTemplate.delete(recentCommandsKey);
  }

  private String resolveSessionKey(String sessionId, String suffix) {
    return String.format(SESSION_KEY_PREFIX_FORMAT, sessionId) + suffix;
  }

  private String safeString(String value) {
    return value == null ? "" : value;
  }
}
