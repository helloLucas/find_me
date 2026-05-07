package com.lucas.user.dto.response;

import com.lucas.auth.entity.AuthProvider;
import java.time.LocalDateTime;

/**
 * 서비스 계층에서 컨트롤러 계층으로 유저 정보를 전달하기 위한 DTO. LazyInitializationException을 방지하기 위해 트랜잭션 내에서 필요한 데이터를
 * 추출하여 담습니다.
 */
public record UserResponseDto(
    Long id,
    String email,
    String nickname,
    String role,
    AuthProvider provider,
    LocalDateTime lastLoginAt) {}
