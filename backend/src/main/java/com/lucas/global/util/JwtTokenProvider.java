package com.lucas.global.util;

import com.lucas.auth.dto.response.TokenResponse;
import com.lucas.auth.entity.AuthProvider;
import com.lucas.auth.entity.UserRole;
import com.lucas.auth.principal.CustomOAuth2User;
import com.lucas.global.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {

    private final JwtProperties jwtProperties;
    private Key key;

    public JwtTokenProvider(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
    }

    @PostConstruct
    public void init() {
        this.key = Keys.hmacShaKeyFor(jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8));
    }

    public TokenResponse generateToken(CustomOAuth2User customOAuth2User) {
        long now = System.currentTimeMillis();

        Date accessTokenExpiresAt = new Date(now + jwtProperties.getAccessTokenExpiration());
        Date refreshTokenExpiresAt = new Date(now + jwtProperties.getRefreshTokenExpiration());

        String accessToken =
                Jwts.builder()
                        .subject(String.valueOf(customOAuth2User.getUserId()))
                        .claim("role", customOAuth2User.getRole().name())
                        .claim("provider", customOAuth2User.getProvider().name())
                        .claim("email", customOAuth2User.getEmail())
                        .issuedAt(new Date(now))
                        .expiration(accessTokenExpiresAt)
                        .signWith((javax.crypto.SecretKey) key)
                        .compact();

        String refreshToken =
                Jwts.builder()
                        .subject(String.valueOf(customOAuth2User.getUserId()))
                        .claim("type", "refresh")
                        .issuedAt(new Date(now))
                        .expiration(refreshTokenExpiresAt)
                        .signWith((javax.crypto.SecretKey) key)
                        .compact();

        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(customOAuth2User.getUserId())
                .role(customOAuth2User.getRole().name())
                .build();
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith((javax.crypto.SecretKey) key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Long getUserId(String token) {
        return Long.parseLong(parseClaims(token).getSubject());
    }

    public String getRole(String token) {
        return parseClaims(token).get("role", String.class);
    }

    public String getEmail(String token) {
        return parseClaims(token).get("email", String.class);
    }

    public String getNickname(String token) {
        return parseClaims(token).get("nickname", String.class);
    }

    public String getProvider(String token) {
        return parseClaims(token).get("provider", String.class);
    }

    public String generateAccessToken(
            Long userId, String email, String nickname, UserRole role, AuthProvider provider) {
        long now = System.currentTimeMillis();
        Date accessTokenExpiresAt = new Date(now + jwtProperties.getAccessTokenExpiration());

        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("role", role.name())
                .claim("provider", provider.name())
                .claim("email", email)
                .claim("nickname", nickname)
                .issuedAt(new Date(now))
                .expiration(accessTokenExpiresAt)
                .signWith((javax.crypto.SecretKey) key)
                .compact();
    }

    public String generateRefreshToken(Long userId) {
        long now = System.currentTimeMillis();
        Date refreshTokenExpiresAt = new Date(now + jwtProperties.getRefreshTokenExpiration());

        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("type", "refresh")
                .issuedAt(new Date(now))
                .expiration(refreshTokenExpiresAt)
                .signWith((javax.crypto.SecretKey) key)
                .compact();
    }
}
