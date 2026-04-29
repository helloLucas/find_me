package com.lucas.auth.handler;

import com.lucas.auth.dto.PendingUserInfo;
import com.lucas.auth.principal.CustomOAuth2User;
import com.lucas.auth.service.AuthService;
import com.lucas.global.util.JwtUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/** OAuth2 소셜 로그인 성공 시 처리를 담당하는 핸들러 클래스입니다. JWT 토큰 발급 및 Redis 토큰 저장, 로그인 성공 응답 구성을 수행합니다. */
@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

  private final JwtUtil jwtUtil;
  private final AuthService authService;

  @Value("${app.frontend.url}")
  private String frontendUrl;

  @Value("${spring.jwt.access-token-expiration}")
  private long accessTokenExpiration;

  @Value("${spring.jwt.refresh-token-expiration}")
  private long refreshTokenExpiration;

  /**
   * 인증 성공 시 호출되어 사용자의 JWT 토큰을 발급하고 성공 응답을 전송합니다.
   *
   * @param request HTTP 요청 객체
   * @param response HTTP 응답 객체
   * @param authentication 인증된 사용자의 정보를 포함한 인증 객체
   * @throws IOException 입출력 예외
   * @throws ServletException 서블릿 예외
   */
  @Override
  public void onAuthenticationSuccess(
      HttpServletRequest request, HttpServletResponse response, Authentication authentication)
      throws IOException, ServletException {

    CustomOAuth2User customOAuth2User = (CustomOAuth2User) authentication.getPrincipal();

    // 닉네임 입력 대기 또는 계정 전환 확인이 필요한 경우
    if (customOAuth2User.isPendingRegistration()) {
      PendingUserInfo pendingInfo =
          PendingUserInfo.builder()
              .email(customOAuth2User.getEmail())
              .provider(customOAuth2User.getProvider())
              .providerUserId(customOAuth2User.getProviderUserId())
              .oauthName(customOAuth2User.getName())
              .guest(customOAuth2User.isGuest())
              .existingMemberId(customOAuth2User.isConflict() ? customOAuth2User.getUserId() : null)
              .build();

      String tempKey = authService.savePendingUserInfo(pendingInfo); // redis에 임시 저장

      // 게스트 전환 대기 중인 경우 guestId도 함께 전달
      Long targetId = customOAuth2User.getUserId();

      String targetUrl =
          UriComponentsBuilder.fromUriString(frontendUrl + "/oauth/callback")
              .queryParam("tempKey", tempKey)
              .queryParam("isNewUser", customOAuth2User.isNewUser())
              .queryParam("isGuest", customOAuth2User.isGuest())
              .queryParam("isConflict", customOAuth2User.isConflict())
              .queryParam(
                  "guestId",
                  (customOAuth2User.isGuest() && !customOAuth2User.isConflict()) ? targetId : "")
              .queryParam(
                  "nickname",
                  customOAuth2User.isGuest()
                      ? (customOAuth2User.getNickname() != null
                          ? customOAuth2User.getNickname()
                          : "")
                      : "")
              .encode(StandardCharsets.UTF_8)
              .build()
              .toUriString();

      response.sendRedirect(targetUrl);
      return;
    }

    Long userId = customOAuth2User.getUserId();
    String email = customOAuth2User.getEmail();
    String role = customOAuth2User.getRole().name();
    String nickname = customOAuth2User.getNickname();

    // 전용 서비스(CustomOAuth2UserService)에서 판단한 플래그를 사용하여 경로를 결정합니다.
    boolean isNewUser = customOAuth2User.isNewUser();
    boolean isGuest = customOAuth2User.isGuest();

    String accessToken =
        jwtUtil.createAccessToken(
            userId, email, nickname, customOAuth2User.getProvider(), role, accessTokenExpiration);

    String refreshToken = jwtUtil.createRefreshToken(userId, email, refreshTokenExpiration);

    // refresh token 을 Redis에 저장
    authService.replaceRefreshToken(userId, refreshToken);

    // 1. Refresh Token을 HttpOnly 쿠키에 안전하게 저장 (XSS 방어 및 Cross-Origin 통신 허용)
    ResponseCookie cookie =
        ResponseCookie.from("refresh_token", refreshToken)
            .httpOnly(true)
            .secure(true) // SameSite=None 옵션을 위해 필요 (localhost에서는 보통 예외적으로 허용됨)
            .path("/")
            .maxAge(refreshTokenExpiration / 1000)
            .sameSite("None") // 프론트와 백엔드의 포트/도메인이 다를 때 필수
            .build();

    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

    // 2. Access Token과 신규 유저 여부만 프론트엔드 콜백 URL 파라미터로 전달
    String targetUrl =
        UriComponentsBuilder.fromUriString(frontendUrl + "/oauth/callback")
            .queryParam("accessToken", accessToken)
            .queryParam("isNewUser", isNewUser)
            .queryParam("isGuest", isGuest)
            .build()
            .toUriString();

    response.sendRedirect(targetUrl);
  }
}
