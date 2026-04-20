package com.lucas.user.service;

import com.lucas.auth.dto.response.TokenResponse;
import com.lucas.auth.entity.UserRole;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.global.util.JwtUtil;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final RedisTemplate<String, String> redisTemplate;

    @Transactional
    public TokenResponse registerNickname(Long userId, String nickname) {
        if (nickname == null || nickname.isBlank()) {
            throw new CustomException(ErrorCode.H1000); // 닉네임 유효성 검사 실패
        }

        String trimmedNickname = nickname.trim();

        if (trimmedNickname.length() > 50) {
            throw new CustomException(ErrorCode.H1000); // 닉네임 길이 초과
        }

        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() -> new CustomException(ErrorCode.E3000)); // 사용자 조회 실패

        if (user.getRole() != UserRole.GUEST) {
            throw new CustomException(ErrorCode.A1001); // 이미 가입 완료된 경우 상태 전이 불가
        }

        user.updateNicknameAndRole(trimmedNickname, UserRole.USER);

        log.info(
                "사용자 승급 완료 - userId: {}, 닉네임: {}, 역할: {}",
                user.getId(),
                user.getNickname(),
                user.getRole());

        // DB 기준 최신 정보로 토큰 재발급
        String newAccessToken =
                jwtUtil.createAccessToken(
                        user.getId(),
                        user.getEmail(),
                        user.getNickname(),
                        user.getProvider(),
                        user.getRole().name(),
                        30 * 60 * 1000L);

        String newRefreshToken =
                jwtUtil.createRefreshToken(
                        user.getId(), user.getEmail(), 14 * 24 * 60 * 60 * 1000L);

        // Refresh Token Rotation (기존 토큰 무효화)
        String key = "refresh_token:" + userId;

        redisTemplate.opsForValue().set(key, newRefreshToken, 14, TimeUnit.DAYS);

        log.info("Refresh Token 재발급 및 저장 완료 - userId: {}", userId);

        return TokenResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .build();
    }
}
