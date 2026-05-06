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

/** 인증 관련 비즈니스 로직을 처리하는 서비스 클래스입니다. Refresh Token 관리, 토큰 갱신, 로그아웃, 게스트 초기화 등의 기능을 수행합니다. */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
  // Redis Key Prefix
  private static final String REFRESH_TOKEN_PREFIX = "refresh_token:";
  private static final String PENDING_USER_PREFIX = "pending_user:";

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
   * @param userId 유저 식별값
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
   * 유효한 Refresh Token을 확인하고 새로운 토큰 세트(Access, Refresh)를 발급합니다.
   *
   * @param refreshToken 현재 사용 중인 Refresh Token
   * @return 발급된 새로운 토큰 정보를 담은 객체
   * @throws CustomException 토큰이 유효하지 않거나 일치하지 않을 경우 발생
   */
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

      // 3. Redis에서 해당 유저의 토큰 조회
      String savedToken = redisTemplate.opsForValue().get(key);

      // 4. 저장된 토큰이 없거나 보낸 토큰과 일치하지 않으면 에러
      if (savedToken == null) {
        log.warn("Redis에 Refresh Token이 존재하지 않습니다. userId: {}", userId);
        throw new CustomException(ErrorCode.E1000);
      }

      if (!savedToken.equals(refreshToken)) {
        log.warn("Redis Refresh Token 불일치. userId: {}", userId);
        throw new CustomException(ErrorCode.E1000);
      }

      // 5. 유저 정보 조회
      User user = userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.E3000));

      // 6. 새 토큰 세트 발급
      AuthProvider provider = user.getSocialLogins().isEmpty()
          ? null
          : user.getSocialLogins().get(0).getProvider();

      String newAccessToken = jwtUtil.createAccessToken(
          user.getId(),
          user.getEmail(),
          user.getNickname(),
          provider,
          user.getRole().name(),
          accessTokenExpiration);

      String newRefreshToken = jwtUtil.createRefreshToken(user.getId(), user.getEmail(), refreshTokenExpiration);

      // 7. Redis 갱신 및 TTL 재설정
      replaceRefreshToken(userId, newRefreshToken);

      return RefreshTokenResponse.builder()
          .accessToken(newAccessToken)
          .refreshToken(newRefreshToken)
          .build();

    } catch (CustomException e) {
      throw e;
    } catch (Exception e) {
      log.error("Token Refresh Error", e);
      throw new CustomException(ErrorCode.G1000);
    }
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
    PendingUserInfo guestInfo = PendingUserInfo.builder()
        .guest(true)
        .build();

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
      throw new CustomException(ErrorCode.H1000); // 401 혹은 인증 만료 에러
    }
    try {
      return objectMapper.readValue(value, PendingUserInfo.class);
    } catch (Exception e) {
      log.error("임시 가입 정보 파싱 실패", e);
      throw new CustomException(ErrorCode.G1000);
    }
  }

  /** 가입이 완료된 후 사용된 임시 데이터를 삭제합니다. */
  public void deletePendingUserInfo(String tempKey) {
    redisTemplate.delete(PENDING_USER_PREFIX + tempKey);
  }
}
