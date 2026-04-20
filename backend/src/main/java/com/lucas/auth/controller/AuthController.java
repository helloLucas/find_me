package com.lucas.auth.controller;

import com.lucas.auth.dto.request.RefreshTokenRequest;
import com.lucas.auth.dto.response.RefreshTokenResponse;
import com.lucas.auth.dto.response.TokenResponse;
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

/** 인증 및 권한 관련 API를 처리하는 컨트롤러 클래스입니다. OAuth2 로그인, 토큰 재발급, 로그아웃, 게스트 초기화 등의 기능을 제공합니다. */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

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
     *
     * @param request Refresh Token 정보가 담긴 요청 객체
     * @return 재발급된 토큰 정보를 포함한 응답 객체
     */
    @PostMapping("/refresh")
    public ResponseEntity<BaseResponse<RefreshTokenResponse>> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {
        RefreshTokenResponse response = authService.refresh(request.getRefreshToken());
        return ResponseEntity.ok(BaseResponse.success("토큰이 재발급되었습니다.", response));
    }

    /**
     * 현재 로그인한 사용자의 로그아웃을 처리합니다. Redis에 저장된 Refresh Token을 삭제합니다.
     *
     * @param principal 인증된 사용자의 정보를 담고 있는 객체
     * @return 로그아웃 성공 메시지
     */
    @PostMapping("/logout")
    public ResponseEntity<BaseResponse<Void>> logout(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        if (principal == null) {
            throw new CustomException(ErrorCode.E1000);
        }

        authService.logout(principal.getUserId());
        return ResponseEntity.ok(BaseResponse.success("로그아웃이 완료되었습니다."));
    }

    /**
     * 게스트 사용자의 세션을 초기화하고 임시 토큰을 발급합니다.
     *
     * @return 발급된 게스트 토큰 정보를 포함한 응답 객체
     */
    @GetMapping("/guest-init")
    public ResponseEntity<BaseResponse<TokenResponse>> initGuest() {
        TokenResponse response = authService.initGuest();
        return ResponseEntity.ok(BaseResponse.success("게스트 세션이 초기화되었습니다.", response));
    }
}
