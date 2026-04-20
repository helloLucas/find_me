package com.lucas.auth.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 인증 성공 시 클라이언트에 반환되는 토큰 및 사용자 정보를 담는 DTO 클래스입니다. */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenResponse {

    /** Access Token 문자열 */
    private String accessToken;

    /** Refresh Token 문자열 */
    private String refreshToken;

    /** 사용자의 식별값 */
    private Long userId;

    /** 사용자의 권한 (GUEST, MEMBER) */
    private String role;

    /** 사용자의 닉네임 */
    private String nickname;

    /** 닉네임 설정이 필요한 신규 사용자인지 여부 */
    private boolean isNewUser;
}
