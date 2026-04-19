package com.lucas.auth.controller;

import com.lucas.auth.dto.request.RefreshTokenRequest;
import com.lucas.auth.dto.response.RefreshTokenResponse;
import com.lucas.auth.principal.CustomUserPrincipal;
import com.lucas.auth.service.AuthService;
import com.lucas.global.dto.BaseResponse;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * OAuth2 골격 검증을 위한 테스트용 컨트롤러입니다.
 * JWT, Mattermost 등 복잡한 로직 없이 오직 Google OAuth 로그인 흐름만 테스트합니다.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 커스텀 로그인 페이지 (테스트용)
     * SecurityConfig의 .loginPage("/login") 요청 시 이 메서드로 들어옵니다.
     */
    @GetMapping(value = "/login", produces = "text/html; charset=UTF-8")
    public String loginPage() {
        return "<h1>OAuth2 로그인 테스트</h1>" +
               "<a href='/oauth2/authorization/google'>구글로 로그인하기</a>";
    }

    @PostMapping("/refresh")
    public ResponseEntity<BaseResponse<RefreshTokenResponse>> refresh(
        @Valid @RequestBody RefreshTokenRequest request
    ) {
        RefreshTokenResponse response = authService.refresh(request.getRefreshToken());
        return ResponseEntity.ok(BaseResponse.success("토큰이 재발급되었습니다.", response));
    }

    @PostMapping("/logout")
    public ResponseEntity<BaseResponse<Void>> logout(
        @AuthenticationPrincipal CustomUserPrincipal principal
    ) {
        if (principal == null) {
            throw new CustomException(ErrorCode.E1000);
        }

        authService.logout(principal.getUserId());
        return ResponseEntity.ok(BaseResponse.success("로그아웃이 완료되었습니다."));
    }
}
