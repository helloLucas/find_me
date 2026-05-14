package com.lucas.fragment.service;

import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MinigameSessionService {

  private final RedisTemplate<String, String> redisTemplate;
  private static final String KEY_PREFIX = "minigame:session:";
  private static final long TTL_MINUTES = 30;

  public String createSession(Long userId, String fragmentCode) {
    String sessionId = UUID.randomUUID().toString();
    String key = resolveKey(userId, fragmentCode);
    String value = sessionId + ":" + System.currentTimeMillis();
    
    // 기존 세션이 있으면 덮어씌움 (최신 요청 기준)
    redisTemplate.opsForValue().set(key, value, TTL_MINUTES, TimeUnit.MINUTES);
    log.info("Minigame session created for user: {}, fragment: {}, session: {}", userId, fragmentCode, sessionId);
    return sessionId;
  }

  public boolean verifySession(Long userId, String fragmentCode, String sessionId, long minDurationMs) {
    String key = resolveKey(userId, fragmentCode);
    String value = redisTemplate.opsForValue().get(key);
    
    if (value == null) {
      log.warn("Session verification failed: No session found for user {} and fragment {}", userId, fragmentCode);
      return false;
    }

    String[] parts = value.split(":");
    if (parts.length != 2) {
      log.error("Session verification failed: Invalid session format in Redis for user {} and fragment {}", userId, fragmentCode);
      return false;
    }

    String storedSessionId = parts[0];
    long startTime = Long.parseLong(parts[1]);

    // 세션 ID 일치 여부 확인
    if (!storedSessionId.equals(sessionId)) {
      log.warn("Session verification failed: Session ID mismatch. Expected {}, but got {}", storedSessionId, sessionId);
      return false;
    }

    // 최소 플레이 시간 검증 (curl을 통한 즉시 완료 방지)
    long duration = System.currentTimeMillis() - startTime;
    if (duration < minDurationMs) {
      log.warn("Session verification failed: Playtime too short. Duration: {}ms, Required: {}ms", duration, minDurationMs);
      return false;
    }

    log.info("Session verified successfully for user {} and fragment {}. Duration: {}ms", userId, fragmentCode, duration);

    // 검증 성공 시 세션 삭제 (일회용)
    redisTemplate.delete(key);
    return true;
  }

  private String resolveKey(Long userId, String fragmentCode) {
    return KEY_PREFIX + userId + ":" + fragmentCode;
  }
}
