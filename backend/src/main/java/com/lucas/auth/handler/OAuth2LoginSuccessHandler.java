package com.lucas.auth.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lucas.auth.principal.CustomOAuth2User;
import com.lucas.auth.service.AuthService;
import com.lucas.global.util.JwtUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
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
    private final ObjectMapper objectMapper;

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

        Long userId = customOAuth2User.getUserId();
        String email = customOAuth2User.getEmail();
        String role = customOAuth2User.getRole().name();
        String nickname = customOAuth2User.getNickname();

        // 닉네임이 없거나 임시 닉네임인 경우 새로운 사용자로 판단
        boolean isNewUser = (nickname == null || nickname.startsWith("방랑자_"));

        String accessToken =
                jwtUtil.createAccessToken(
                        userId,
                        email,
                        nickname,
                        customOAuth2User.getProvider(),
                        role,
                        30 * 60 * 1000L);

        String refreshToken = jwtUtil.createRefreshToken(userId, email, 14 * 24 * 60 * 60 * 1000L);

        // refresh token 을 Redis에 저장
        authService.replaceRefreshToken(userId, refreshToken);

        // JSON 응답을 보내는 대신, 리다이렉트 URL을 생성
        String targetUrl = UriComponentsBuilder.fromUriString("http://localhost:5173/oauth/callback")
                .queryParam("accessToken", accessToken)
                .queryParam("refreshToken", refreshToken)
                .queryParam("isNewUser", isNewUser)
                .build()
                .toUriString();

        // 브라우저를 프론트엔드의 oauth-callback 페이지로 이동
        response.sendRedirect(targetUrl);
    }
}
