package com.lucas.global.util;

import com.lucas.auth.entity.AuthProvider;
import io.jsonwebtoken.Jwts;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// JWT 토큰을 검증하고 정보를 꺼냄
@Component
public class JwtUtil {
  private SecretKey secretKey;

  // secretKey 생성
  public JwtUtil(@Value("${spring.jwt.secret}") String secret) {
    // 문자열 secret을 바이트 배열로 변환 후 SecretKey 객체 생성
    secretKey =
        new SecretKeySpec(
            secret.getBytes(StandardCharsets.UTF_8), Jwts.SIG.HS256.key().build().getAlgorithm());
  }

  // userId 추출
  public Long getUserId(String token) {
    return Jwts.parser()
        .verifyWith(secretKey)
        .build()
        .parseSignedClaims(token)
        .getPayload()
        .get("userId", Long.class);
  }

  // category 추출
  public String getCategory(String token) {
    return Jwts.parser()
        .verifyWith(secretKey)
        .build()
        .parseSignedClaims(token)
        .getPayload()
        .get("category", String.class);
  }

  // email 추출
  public String getEmail(String token) {
    return Jwts.parser()
        .verifyWith(secretKey)
        .build()
        .parseSignedClaims(token)
        .getPayload()
        .get("email", String.class);
  }

  // role 추출
  public String getRole(String token) {
    return Jwts.parser()
        .verifyWith(secretKey)
        .build()
        .parseSignedClaims(token)
        .getPayload()
        .get("role", String.class);
  }

  // nickname 추출
  public String getNickname(String token) {
    return Jwts.parser()
        .verifyWith(secretKey)
        .build()
        .parseSignedClaims(token)
        .getPayload()
        .get("nickname", String.class);
  }

  // provider 추출
  public String getProvider(String token) {
    return Jwts.parser()
        .verifyWith(secretKey)
        .build()
        .parseSignedClaims(token)
        .getPayload()
        .get("provider", String.class);
  }

  // 토큰 만료 여부 확인
  public Boolean isExpired(String token) {
    return Jwts.parser()
        .verifyWith(secretKey)
        .build()
        .parseSignedClaims(token)
        .getPayload()
        .getExpiration()
        .before(new Date());
  }

  public String createAccessToken(
      Long userId,
      String email,
      String nickname,
      AuthProvider provider,
      String role,
      Long expiredMs) {
    return Jwts.builder()
        .claim("category", "access")
        .claim("userId", userId)
        .claim("email", email)
        .claim("nickname", nickname)
        .claim("provider", provider)
        .claim("role", role)
        .issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + expiredMs))
        .signWith(secretKey)
        .compact();
  }

  public String createRefreshToken(Long userId, String email, Long expiredMs) {
    return Jwts.builder()
        .claim("category", "refresh")
        .claim("userId", userId)
        .claim("email", email)
        .issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + expiredMs))
        .signWith(secretKey)
        .compact();
  }
}
