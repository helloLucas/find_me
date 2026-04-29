package com.lucas.auth.controller;

import lombok.extern.slf4j.Slf4j;

import com.lucas.auth.dto.response.RefreshTokenResponse;
import com.lucas.auth.principal.CustomUserPrincipal;
import com.lucas.auth.service.AuthService;
import com.lucas.global.dto.BaseResponse;
import java.util.HashMap;
import java.util.Map;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.global.util.CookieUtil;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** 인증 및 권한 관련 API를 처리하는 컨트롤러 클래스입니다. OAuth2 로그인, 토큰 재발급, 로그아웃, 게스트 초기화 등의 기능을 제공합니다. */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;
  private final CookieUtil cookieUtil;

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
        cookieUtil.setRefreshTokenCookie(response, result.getRefreshToken());

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

        log.info("User ID: {} logged out.", principal.getUserId());
        authService.logout(principal.getUserId());

        // 브라우저 쿠키 즉시 삭제 (Max-Age 0)
        cookieUtil.setRefreshTokenCookie(response, "");

        return ResponseEntity.ok(BaseResponse.success("로그아웃이 완료되었습니다."));
    }

    /**
     * 게스트 사용자의 정보를 임시 보관하고 식별용 임시 키를 발급합니다.
     *
     * @return 발급된 임시 식별 키(tempKey) 정보를 포함한 응답 객체
     */
    @GetMapping("/guest-init")
    public ResponseEntity<BaseResponse<Map<String, String>>> initGuest() {
        String tempKey = authService.initGuest();
        log.info("Guest session created with tempKey: {}", tempKey);

        Map<String, String> data = new HashMap<>();
        data.put("tempKey", tempKey);

        return ResponseEntity.ok(BaseResponse.success("게스트 세션이 임시 생성되었습니다.", data));
    }

}
