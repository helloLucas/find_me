package com.lucas.global.util;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/** HTTP 쿠키 설정을 위한 공통 유틸리티 클래스입니다. 애플리케이션 전반에서 일관된 쿠키 속성(HttpOnly, Secure, SameSite 등)을 보장합니다. */
@Component
public class CookieUtil {

  @Value("${spring.jwt.refresh-token-expiration}")
  private long refreshTokenExpiration;

  public static final String REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

  /**
   * Refresh Token을 HttpOnly 쿠키로 응답에 추가합니다. SameSite=None, Secure=true 속성을 통해 크로스-오리진 환경에서도 안전하게
   * 전달됩니다.
   *
   * @param response HTTP 응답 객체
   * @param token 리프레시 토큰 값 (로그아웃 시 빈 문자열 전달)
   */
  public void setRefreshTokenCookie(HttpServletResponse response, String token) {

    long maxAge = token.isBlank() ? 0 : (refreshTokenExpiration / 1000);

    ResponseCookie cookie =
        ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, token)
            .httpOnly(true)
            .secure(true) // SameSite=None을 위해 필수 (HTTPS 환경 권장)
            .path("/")
            .maxAge(maxAge)
            .sameSite("None") // 프론트/백엔드 오리진 불일치 시 필수
            .build();

    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
  }
}
