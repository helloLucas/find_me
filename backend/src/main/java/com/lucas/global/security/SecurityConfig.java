package com.lucas.global.security;

import com.lucas.auth.handler.OAuth2LoginFailureHandler;
import com.lucas.auth.handler.OAuth2LoginSuccessHandler;
import com.lucas.auth.oauth.HttpCookieOAuth2AuthorizationRequestRepository;
import com.lucas.auth.service.CustomOAuth2UserService;
import com.lucas.global.config.JwtProperties;
import com.lucas.global.util.JwtAuthenticationFilter;
import com.lucas.global.util.JwtUtil;
import java.util.Arrays;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {

  private final CustomOAuth2UserService customOAuth2UserService;
  private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
  private final OAuth2LoginFailureHandler oAuth2LoginFailureHandler;
  private final HttpCookieOAuth2AuthorizationRequestRepository cookieAuthRequestRepository;
  private final JwtUtil jwtUtil;

  @Value("${app.cors.allowed-origins}")
  private String corsAllowedOrigins;

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

    http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .csrf(csrf -> csrf.disable())
        .formLogin(form -> form.disable())
        .httpBasic(basic -> basic.disable())
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(HttpMethod.OPTIONS, "/**")
                    .permitAll()
                    .requestMatchers("/api/v1/admin/**")
                    .hasRole("ADMIN")
                    .requestMatchers(
                        "/",
                        "/api/v1/auth/refresh",
                        "/api/v1/auth/guest-init",
                        "/api/v1/users/register",
                        "/api/v1/health",
                        "/oauth2/**",
                        "/actuator/**",
                        "/error")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        // == 소셜 로그인 설정 ==//
        .oauth2Login(
            oauth2 ->
                oauth2
                    .loginPage("/")
                    .authorizationEndpoint(
                        authEndpoint ->
                            authEndpoint.authorizationRequestRepository(
                                cookieAuthRequestRepository))
                    .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                    .successHandler(oAuth2LoginSuccessHandler)
                    .failureHandler(oAuth2LoginFailureHandler));

    http.addFilterBefore(
        new JwtAuthenticationFilter(jwtUtil), UsernamePasswordAuthenticationFilter.class);

    http.sessionManagement(
        session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

    return http.build();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();

    config.setAllowedOrigins(
        Arrays.stream(corsAllowedOrigins.split(","))
            .map(String::trim)
            .filter(origin -> !origin.isBlank())
            .toList());
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setExposedHeaders(List.of("Authorization"));
    config.setAllowCredentials(true);
    config.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }
}
