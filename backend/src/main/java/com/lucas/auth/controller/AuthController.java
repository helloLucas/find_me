package com.lucas.auth.controller;

import com.lucas.auth.dto.response.RefreshTokenResponse;
import com.lucas.auth.dto.response.TokenResponse;
import com.lucas.auth.principal.CustomUserPrincipal;
import com.lucas.auth.service.AuthService;
import com.lucas.global.dto.BaseResponse;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** 인증 및 권한 관련 API를 처리하는 컨트롤러 클래스입니다. OAuth2 로그인, 토큰 재발급, 로그아웃, 게스트 초기화 등의 기능을 제공합니다. */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${spring.jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

  /**
   * 커스텀 로그인 페이지 (테스트용) SecurityConfig의 .loginPage("/login") 요청 시 이 메서드로 들어옵니다.
   *
   * @return 로그인 페이지 HTML 내용
   */
  @GetMapping(value = "/login", produces = "text/html; charset=UTF-8")
  public String loginPage() {
    return "<h1>OAuth2 로그인 테스트</h1>" + "<a href='/oauth2/authorization/google'>구글로 로그인하기</a>";
  }

    /**
     * Refresh Token을 사용하여 Access Token 및 Refresh Token을 재발급합니다.
     * 프론트엔드에서 HttpOnly 쿠키의 값을 읽을 수 없으므로, @CookieValue를 사용하여 직접 수집합니다.
     *
     * @param refreshToken 쿠키에서 넘어온 Refresh Token
     * @param response HTTP 응답 객체
     * @return 재발급된 토큰 정보를 포함한 응답 객체
     */
    @PostMapping("/refresh")
    public ResponseEntity<BaseResponse<RefreshTokenResponse>> refresh(
            @CookieValue(value = "refresh_token", required = false) String refreshToken,
            HttpServletResponse response) {

        if (refreshToken == null || refreshToken.isBlank()) {
            throw new CustomException(ErrorCode.E1000);
        }

        RefreshTokenResponse result = authService.refresh(refreshToken);

        // 새로운 리프레시 토큰을 쿠키에 설정
        setRefreshTokenCookie(response, result.getRefreshToken(), refreshTokenExpiration / 1000);

        return ResponseEntity.ok(BaseResponse.success("토큰이 재발급되었습니다.", result));
    }

    /**
     * 현재 로그인한 사용자의 로그아웃을 처리합니다. Redis에 저장된 Refresh Token을 삭제하고 쿠키를 무효화합니다.
     *
     * @param principal 인증된 사용자의 정보를 담고 있는 객체
     * @param response HTTP 응답 객체
     * @return 로그아웃 성공 메시지
     */
    @PostMapping("/logout")
    public ResponseEntity<BaseResponse<Void>> logout(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            HttpServletResponse response) {

        if (principal == null) {
            throw new CustomException(ErrorCode.E1000);
        }

        authService.logout(principal.getUserId());

        // 브라우저 쿠키 즉시 삭제 (Max-Age 0)
        setRefreshTokenCookie(response, "", 0);

        return ResponseEntity.ok(BaseResponse.success("로그아웃이 완료되었습니다."));
    }

    /**
     * 게스트 사용자의 세션을 초기화하고 임시 토큰을 발급합니다.
     *
     * @param response HTTP 응답 객체
     * @return 발급된 게스트 토큰 정보를 포함한 응답 객체
     */
    @GetMapping("/guest-init")
    public ResponseEntity<BaseResponse<TokenResponse>> initGuest(HttpServletResponse response) {
        TokenResponse result = authService.initGuest();

        // 발급된 리프레시 토큰을 쿠키에 설정 (yml 설정값 반영)
        setRefreshTokenCookie(response, result.getRefreshToken(), refreshTokenExpiration / 1000);

        return ResponseEntity.ok(BaseResponse.success("게스트 세션이 초기화되었습니다.", result));
    }

    /**
     * 공통 쿠키 설정 로직을 담당하는 헬퍼 메서드입니다.
     * 모든 인증 방식에서 동일한 쿠키 속성을 보장합니다.
     *
     * @param response HttpServletResponse 객체
     * @param token 리프레시 토큰 값
     * @param maxAge 쿠키 유효 기간 (초 단위)
     */
    private void setRefreshTokenCookie(HttpServletResponse response, String token, long maxAge) {
        ResponseCookie cookie = ResponseCookie.from("refresh_token", token)
                .httpOnly(true)
                .secure(true) // SameSite=None을 위해 필수 (HTTPS 환경 권장)
                .path("/")
                .maxAge(maxAge)
                .sameSite("None") // 프론트/백엔드 오리진 불일치 시 필수
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
