package com.lucas.auth.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * LUCAS 프로젝트 유저 권한 (Enum)
 * - GUEST: 소셜 로그인 전 게스트 세션
 * - MEMBER: 소셜 로그인 완료된 정식 회원
 */
/**
 * LUCAS 프로젝트의 유저 권한 및 상태를 정의하는 Enum 클래스입니다.
 */
@Getter
@RequiredArgsConstructor
public enum UserRole {
    /** 소셜 로그인 전의 임시 게스트 권한 */
    GUEST("ROLE_GUEST"),
    /** 소셜 로그인이 완료된 정식 회원 권한 */
    MEMBER("ROLE_MEMBER");

    /** Spring Security에서 사용하는 권한 식별 키 */
    private final String key;
}
