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

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;
    private final AuthService authService;
    private final ObjectMapper objectMapper;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request, HttpServletResponse response, Authentication authentication)
            throws IOException, ServletException {

        CustomOAuth2User customOAuth2User = (CustomOAuth2User) authentication.getPrincipal();

        Long userId = customOAuth2User.getUserId();
        String email = customOAuth2User.getEmail();
        String role = customOAuth2User.getRole().name();
        String nickname = customOAuth2User.getNickname();

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
                        .build();

        BaseResponse<TokenResponse> successResponse =
                BaseResponse.success("로그인에 성공했습니다.", tokenResponse);

        response.setStatus(HttpStatus.OK.value());
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(successResponse));
    }
}
