package com.lucas.auth.service;

import com.lucas.auth.dto.response.RefreshTokenResponse;
import com.lucas.auth.dto.response.TokenResponse;
import com.lucas.auth.entity.UserRole;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.global.util.JwtUtil;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * 인증 관련 비즈니스 로직을 처리하는 서비스 클래스입니다.
 * Refresh Token 관리, 토큰 갱신, 로그아웃, 게스트 초기화 등의 기능을 수행합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
    // Redis Key Prefix
    private static final String REFRESH_TOKEN_PREFIX = "refresh_token:";
    private static final long REFRESH_TOKEN_TTL_DAYS = 14;

    private final RedisTemplate<String, String> redisTemplate;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    /**
     * Redis에 사용자의 Refresh Token을 저장하거나 기존 토큰을 갱신합니다.
     *
     * @param userId 유저 식별값
     * @param refreshToken 저장할 Refresh Token
     */
    public void replaceRefreshToken(Long userId, String refreshToken) {
        String key = REFRESH_TOKEN_PREFIX + userId;
        // Key: refresh_token:{userId}, Value: token, TTL: 14일
        redisTemplate.opsForValue().set(key, refreshToken, REFRESH_TOKEN_TTL_DAYS, TimeUnit.DAYS);
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
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.E3000));

            // 6. 새 토큰 세트 발급
            // Access: 30분, Refresh: 14일
            String newAccessToken = jwtUtil.createAccessToken(
                user.getId(), user.getEmail(), user.getNickname(),
                user.getProvider(), user.getRole().name(), 30 * 60 * 1000L
            );

            String newRefreshToken = jwtUtil.createRefreshToken(
                user.getId(), user.getEmail(), 14 * 24 * 60 * 60 * 1000L
            );

            // 7. Redis 갱신 및 TTL 재설정 (14일)
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
     * 사용자의 로그아웃을 처리합니다.
     * Redis에서 해당 유저의 Refresh Token을 삭제합니다.
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
     * 새로운 게스트 사용자를 생성하고 초기 토큰 정보를 발급합니다.
     *
     * @return 생성된 게스트의 토큰 정보를 담은 객체
     */
    @Transactional
    public TokenResponse initGuest() {
        String tempNickname = "방랑자_" + UUID.randomUUID().toString().substring(0, 4);
        User guest = User.builder()
            .nickname(tempNickname)
            .oauthName("GUEST_" + UUID.randomUUID().toString().substring(0, 8))
            .role(UserRole.GUEST)
            .build();
        userRepository.save(guest);

        String accessToken = jwtUtil.createAccessToken(guest.getId(), null, guest.getNickname(), null, guest.getRole().name(), 30 * 60 * 1000L);
        String refreshToken = jwtUtil.createRefreshToken(guest.getId(), null, 14 * 24 * 60 * 60 * 1000L);

        replaceRefreshToken(guest.getId(), refreshToken); // Redis 저장

        return TokenResponse.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .userId(guest.getId())
            .role(guest.getRole().name())
            .nickname(guest.getNickname())
            .build();
    }
}
