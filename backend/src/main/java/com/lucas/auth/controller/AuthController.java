package com.lucas.auth.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * OAuth2 골격 검증을 위한 테스트용 컨트롤러입니다.
 * JWT, Mattermost 등 복잡한 로직 없이 오직 Google OAuth 로그인 흐름만 테스트합니다.
 */
@RestController
public class AuthController {
    /**
     * 커스텀 로그인 페이지 (테스트용)
     * SecurityConfig의 .loginPage("/login") 요청 시 이 메서드로 들어옵니다.
     */
    @GetMapping(value = "/login", produces = "text/html; charset=UTF-8")
    public String loginPage() {
        return "<h1>OAuth2 로그인 테스트</h1>" +
               "<a href='/oauth2/authorization/google'>구글로 로그인하기</a>";
    }
}
