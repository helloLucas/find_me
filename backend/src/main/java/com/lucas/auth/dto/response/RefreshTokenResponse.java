package com.lucas.auth.dto.response;

import lombok.Builder;
import lombok.Getter;

/** 토큰 재발급 응답 정보를 담는 DTO 클래스입니다. */
@Getter
@Builder
public class RefreshTokenResponse {

  private String accessToken;
  private String refreshToken;
}
