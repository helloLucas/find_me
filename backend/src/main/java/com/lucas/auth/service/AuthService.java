package com.lucas.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lucas.auth.dto.PendingUserInfo;
import com.lucas.auth.dto.response.RefreshTokenResponse;
import com.lucas.auth.entity.AuthProvider;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.global.util.JwtUtil;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 인증 관련 비즈니스 로직을 처리하는 서비스 클래스입니다. Refresh Token 관리, 토큰 갱신, 로그아웃, 게스트 초기화 등의 기능을
 * 수행합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
  // Redis Key Prefix
  private static final String REFRESH_TOKEN_PREFIX = "refresh_token:";
  private static final String PENDING_USER_PREFIX = "pending_user:";

  /**
   * Grace Token Prefix: RTR 경쟁 조건 방지용 임시 키
   *
   * <p>
   * 토큰 교체(Rotation) 직후, 동시 요청으로 인해 짧은 지연으로 들어오는 Old Token을 악의적 탈취로 오탐지하지 않도록 30초간
   * 임시 보관합니다.
   *
   * <p>
   * Key 형식: refresh_token:grace:{old_token_value}
   *
   * <p>
   * Value 형식: userId (String)
   *
   * <p>
   * TTL: 30초
   */
  private static final String GRACE_TOKEN_PREFIX = "refresh_token:grace:";

  private static final long GRACE_PERIOD_SECONDS = 30;

  private final StringRedisTemplate redisTemplate;
  private final JwtUtil jwtUtil;
  private final UserRepository userRepository;
  private final ObjectMapper objectMapper;

  @Value("${spring.jwt.access-token-expiration}")
  private long accessTokenExpiration;

  @Value("${spring.jwt.refresh-token-expiration}")
  private long refreshTokenExpiration;

  /**
   * Redis에 사용자의 Refresh Token을 저장하거나 기존 토큰을 갱신합니다.
   *
   * @param userId       유저 식별값
   * @param refreshToken 저장할 Refresh Token
   */
  public void replaceRefreshToken(Long userId, String refreshToken) {
    String key = REFRESH_TOKEN_PREFIX + userId;
    // Redis 저장 및 TTL 설정 (Refresh Token 만료 시간과 동기화)
    redisTemplate
        .opsForValue()
        .set(key, refreshToken, refreshTokenExpiration, TimeUnit.MILLISECONDS);
    log.info("Refresh Token 저장 완료 - userId: {}", userId);
  }

  /**
   * 성공 로그인 처리를 완료합니다.
   *
   * <p>
   * lastLoginAt은 이 메서드를 통해서만 갱신하여 일반 API 액션, 토큰 재발급, 로그아웃과 분리합니다.
   *
   * @param userId       유저 식별값
   * @param refreshToken 저장할 Refresh Token
   */
  @Transactional
  public void completeSuccessfulLogin(Long userId, String refreshToken) {
    int updatedRows = userRepository.updateLastLoginAt(userId);
    if (updatedRows == 0) {
      throw new CustomException(ErrorCode.E3000);
    }

    replaceRefreshToken(userId, refreshToken);
    log.info("마지막 로그인 시각 갱신 완료 - userId: {}", userId);
  }

  /**
   * 유효한 Refresh Token을 확인하고 새로운 토큰 세트(Access, Refresh)를 발급합니다.
   *
   * @param refreshToken 현재 사용 중인 Refresh Token
   * @return 발급된 새로운 토큰 정보를 담은 객체
   * @throws CustomException 토큰이 유효하지 않거나 일치하지 않을 경우 발생
   */
  @Transactional
  public RefreshTokenResponse refresh(String refreshToken) {
    if (refreshToken == null || refreshToken.isBlank()) {
      throw new CustomException(ErrorCode.H1000);
    }

    try {
      // 1. JWT 유효성 검사
      if (jwtUtil.isExpired(refreshToken)) {
        throw new CustomException(ErrorCode.E1000);
      }

      String category = jwtUtil.getCategory(refreshToken);
      if (!"refresh".equals(category)) {
        throw new CustomException(ErrorCode.H1000);
      }

      // 2. JWT에서 userId 추출
      Long userId = jwtUtil.getUserId(refreshToken);
      String key = REFRESH_TOKEN_PREFIX + userId;

      // 3. Redis에서 해당 유저의 최신 토큰 조회
      String savedToken = redisTemplate.opsForValue().get(key);

      // 4. 저장된 토큰이 없음 → 로그아웃 or 완전 만료 상태
      if (savedToken == null) {
        log.warn("Redis에 Refresh Token이 존재하지 않습니다. userId: {}", userId);
        throw new CustomException(ErrorCode.E1000);
      }

      // 5. 최신 토큰과 일치하는 경우 → 정상 흐름: RTR 수행
      if (savedToken.equals(refreshToken)) {
        return rotateTokens(userId, refreshToken);
      }

      // ─── 6. 불일치 감지: Grace Period(유예 기간) 조회 ──────────────────────────
      //
      // 동시 다발적 /refresh 요청(다중 탭, 네트워크 재전송 등)에서 첫 번째 요청이
      // 이미 토큰을 교체했을 때, 간발의 차이로 들어오는 Old Token을 탈취로 오탐지하면
      // 정상 사용자를 강제 로그아웃시키는 UX 결함이 발생합니다.
      //
      // Grace Token Key: refresh_token:grace:{old_token_value}
      // → 토큰 교체 직후 30초 TTL로 보관된 이전 토큰 여부를 확인합니다.
      String graceKey = GRACE_TOKEN_PREFIX + refreshToken;
      String graceValue = redisTemplate.opsForValue().get(graceKey);

      if (graceValue != null) {
        // Grace Token 매칭 → 동시성으로 인한 정상 지연 요청
        // 새 토큰을 재발급하지 않고(RTR 재수행 금지), 현재 최신 토큰 정보를 그대로 반환합니다.
        log.info("Grace Token 매칭. 동시 요청으로 판단하여 현재 유효 토큰 반환. userId: {}", userId);

        User user = userRepository
            .findByIdWithSocialLogins(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.E3000));

        AuthProvider provider = user.getSocialLogins().isEmpty() ? null : user.getSocialLogins().get(0).getProvider();

        // 새 Access Token만 재발급 (Refresh Token은 savedToken 그대로 유지)
        String newAccessToken = jwtUtil.createAccessToken(
            user.getId(),
            user.getEmail(),
            user.getNickname(),
            provider,
            user.getRole().name(),
            accessTokenExpiration);

        return RefreshTokenResponse.builder()
            .accessToken(newAccessToken)
            .refreshToken(savedToken) // 현재 Redis에 저장된 최신 Refresh Token 반환
            .build();
      }

      // ─── 7. Grace Token에도 없음 → 토큰 탈취 의심 ────────────────────────────
      //
      // 유효 기간이 지난 완전히 낯선 토큰이므로, 보안을 위해 해당 유저의
      // 모든 세션을 무효화(Redis 토큰 삭제)하고 강제 로그아웃 처리합니다.
      log.warn("Redis Refresh Token 불일치 (탈취 의심). 모든 세션 무효화. userId: {}", userId);
      redisTemplate.delete(key); // 모든 세션 즉시 무효화
      throw new CustomException(ErrorCode.E1000);

    } catch (CustomException e) {
      throw e;
    } catch (Exception e) {
      log.error("Token Refresh Error", e);
      throw new CustomException(ErrorCode.G1000);
    }
  }

  /**
   * Refresh Token Rotation(RTR)을 수행합니다.
   *
   * <p>
   * 1. 기존(Old) Refresh Token을 Grace Key로 30초간 임시 보관합니다. 2. 새로운 Access Token과
   * Refresh Token을
   * 발급합니다. 3. Redis의 최신 토큰을 새 토큰으로 교체합니다.
   *
   * @param userId          토큰 소유 유저의 식별값
   * @param oldRefreshToken 교체 전 현재 유효한 Refresh Token
   * @return 새로 발급된 토큰 세트
   */
  private RefreshTokenResponse rotateTokens(Long userId, String oldRefreshToken) {
    User user = userRepository
        .findByIdWithSocialLogins(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.E3000));

    AuthProvider provider = user.getSocialLogins().isEmpty() ? null : user.getSocialLogins().get(0).getProvider();

    String newAccessToken = jwtUtil.createAccessToken(
        user.getId(),
        user.getEmail(),
        user.getNickname(),
        provider,
        user.getRole().name(),
        accessTokenExpiration);

    String newRefreshToken = jwtUtil.createRefreshToken(user.getId(), user.getEmail(), refreshTokenExpiration);

    // [Grace Period] 기존 토큰을 즉시 폐기하지 않고 30초간 임시 보관
    // → 동시 요청의 Old Token이 탈취 의심으로 오탐지되는 경쟁 조건을 방지합니다.
    String graceKey = GRACE_TOKEN_PREFIX + oldRefreshToken;
    redisTemplate
        .opsForValue()
        .set(graceKey, String.valueOf(userId), GRACE_PERIOD_SECONDS, TimeUnit.SECONDS);
    log.debug("Grace Token 저장 완료 (TTL: {}s) - userId: {}", GRACE_PERIOD_SECONDS, userId);

    // 최신 Refresh Token으로 교체 (TTL은 refresh-token-expiration 그대로 유지)
    replaceRefreshToken(userId, newRefreshToken);

    return RefreshTokenResponse.builder()
        .accessToken(newAccessToken)
        .refreshToken(newRefreshToken)
        .build();
  }

  /**
   * 사용자의 로그아웃을 처리합니다. Redis에서 해당 유저의 Refresh Token을 삭제합니다.
   *
   * @param userId 로그아웃할 유저의 식별값
   */
  public void logout(Long userId) {
    String key = REFRESH_TOKEN_PREFIX + userId;
    Boolean isDeleted = redisTemplate.delete(key);

    if (Boolean.TRUE.equals(isDeleted)) {
      log.info("Redis에서 Refresh Token 삭제 성공 - userId: {}", userId);
    } else {
      log.warn("삭제할 Refresh Token이 Redis에 존재하지 않습니다. userId: {}", userId);
    }
  }

  /**
   * 게스트 정보를 임시 보관하고 식별용 임시 키를 반환합니다. (DB 미저장)
   *
   * @return 임시 식별 키 (UUID)
   */
  public String initGuest() {
    PendingUserInfo guestInfo = PendingUserInfo.builder().guest(true).build();

    return savePendingUserInfo(guestInfo);
  }

  /**
   * 가입 전 임시 유저 정보를 Redis에 저장하고 식별용 임시 키를 반환합니다. (10분 만료)
   *
   * @param info 임시 저장할 유저 정보
   * @return 임시 식별 키 (UUID)
   */
  public String savePendingUserInfo(PendingUserInfo info) {
    String tempKey = UUID.randomUUID().toString();
    try {
      String value = objectMapper.writeValueAsString(info);
      String fullKey = PENDING_USER_PREFIX + tempKey;
      redisTemplate.opsForValue().set(fullKey, value, 10, TimeUnit.MINUTES);
      log.info("Redis 저장 완료 - [Full Key: {}]", fullKey);
      return tempKey;
    } catch (Exception e) {
      log.error("임시 가입 정보 저장 실패", e);
      throw new CustomException(ErrorCode.G1000);
    }
  }

  /**
   * Redis에서 임시 유저 정보를 조회합니다.
   *
   * @param tempKey 임시 식별 키
   * @return 조회된 유저 정보
   */
  public PendingUserInfo getPendingUserInfo(String tempKey) {
    String value = redisTemplate.opsForValue().get(PENDING_USER_PREFIX + tempKey);
    if (value == null) {
      log.warn("임시 가입 정보를 찾을 수 없거나 만료되었습니다. tempKey: {}", tempKey);
      throw new CustomException(ErrorCode.E1002); // 401: Redis TTL 만료 → 재인증 필요
    }
    try {
      return objectMapper.readValue(value, PendingUserInfo.class);
    } catch (Exception e) {
      log.error("임시 가입 정보 파싱 실패", e);
      throw new CustomException(ErrorCode.G1000); // 500: 서버 내부 파싱 오류
    }
  }

  /** 가입이 완료된 후 사용된 임시 데이터를 삭제합니다. */
  public void deletePendingUserInfo(String tempKey) {
    redisTemplate.delete(PENDING_USER_PREFIX + tempKey);
  }
}
