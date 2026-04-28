package com.lucas.story.service;

import java.util.List;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

/** Redis를 사용하여 명령어 로그를 관리하는 서비스 구현체입니다. LPUSH와 LTRIM 명령어를 사용하여 최근 10개의 로그를 효율적으로 유지합니다. */
@Service
@Slf4j
@RequiredArgsConstructor
public class CommandLogServiceImpl implements CommandLogService {

  private static final String KEY_PREFIX = "lucas:command:log:";
  private static final int MAX_LOG_SIZE = 10;
  private static final long EXPIRATION_DAYS = 7;

  private final RedisTemplate<String, String> redisTemplate;

  /**
   * 명령어를 Redis List의 맨 앞에 저장하고, 크기를 10개로 제한합니다. 로그의 유효 기간은 7일로 설정합니다.
   *
   * @param userId 사용자 ID
   * @param command 입력된 명령어 문자열
   */
  @Override
  public void logCommand(Long userId, String command) {
    String key = KEY_PREFIX + userId;

    try {
      // 1. 리스트의 맨 앞에 명령어 추가 (LPUSH)
      redisTemplate.opsForList().leftPush(key, command);

      // 2. 리스트 크기를 최근 10개로 제한 (LTRIM)
      redisTemplate.opsForList().trim(key, 0, MAX_LOG_SIZE - 1);

      // 3. 만료 시간 설정 (7일)
      redisTemplate.expire(key, EXPIRATION_DAYS, TimeUnit.DAYS);

      log.info("Successfully logged command to Redis for user {}: {}", userId, command);
    } catch (Exception e) {
      // Redis 장애가 비즈니스 로직(스토리 진행)에 영향을 주지 않도록 예외 처리 후 로그만 남깁니다.
      log.error("Failed to log command to Redis for user {}", userId, e);
    }
  }

  /**
   * Redis에서 해당 사용자의 최근 로그들을 조회합니다.
   *
   * @param userId 사용자 ID
   * @return 명령어 리스트
   */
  @Override
  public List<String> getRecentCommands(Long userId) {
    String key = KEY_PREFIX + userId;
    try {
      return redisTemplate.opsForList().range(key, 0, MAX_LOG_SIZE - 1);
    } catch (Exception e) {
      log.error("Failed to retrieve commands from Redis for user {}", userId, e);
      return List.of(); // 장애 시 빈 리스트 반환
    }
  }
}
