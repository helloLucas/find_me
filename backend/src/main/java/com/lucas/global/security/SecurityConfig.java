package com.lucas.global.security;

import com.lucas.auth.handler.OAuth2LoginSuccessHandler;
import com.lucas.auth.service.CustomOAuth2UserService;
import com.lucas.global.config.JwtProperties;
import com.lucas.global.util.JwtAuthenticationFilter;
import com.lucas.global.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {

    // OAuth 로그인 성공 후 사용자 정보 조회/저장
    private final CustomOAuth2UserService customOAuth2UserService;
    // OAuth 로그인 성공 시 JWT 발급
    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    private final JwtUtil jwtUtil;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .formLogin(form -> form.disable())
            .httpBasic(basic -> basic.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/",
                    "/api/v1/auth/login",
                    "/api/v1/auth/refresh",
                    "/api/v1/auth/guest-init",
                    "/oauth2/**",
                    "/error" // 로그인 실패 후 기본 /error 로 리다이렉트되는 경우 403 방지를 위함
                ).permitAll()
                .anyRequest().authenticated()
            )
            //== 소셜 로그인 설정 ==//
            .oauth2Login(oauth2 -> oauth2
                .loginPage("/login")
                .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                .successHandler(oAuth2LoginSuccessHandler)
            );

        http.addFilterBefore(
            new JwtAuthenticationFilter(jwtUtil),
            UsernamePasswordAuthenticationFilter.class
        );

        http.sessionManagement(session -> session
            .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
        );

        return http.build();
    }
}
