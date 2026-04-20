package com.lucas.auth.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lucas.auth.dto.response.TokenResponse;
import com.lucas.auth.principal.CustomOAuth2User;
import com.lucas.auth.service.AuthService;
import com.lucas.global.dto.BaseResponse;
import com.lucas.global.util.JwtUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

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

        TokenResponse tokenResponse =
                TokenResponse.builder()
                        .accessToken(accessToken)
                        .refreshToken(refreshToken)
                        .userId(userId)
                        .role(role)
                        .nickname(nickname)
                        .isNewUser(isNewUser)
                        .build();

        BaseResponse<TokenResponse> successResponse =
                BaseResponse.success("로그인에 성공했습니다.", tokenResponse);

        response.setStatus(HttpStatus.OK.value());
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(successResponse));
    }
}
