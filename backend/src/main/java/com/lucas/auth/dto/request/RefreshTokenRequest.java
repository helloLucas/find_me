package com.lucas.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 토큰 재발급 요청 시 사용되는 DTO 클래스입니다.
 */
@Getter
@NoArgsConstructor
public class RefreshTokenRequest {

    @NotBlank(message = "refreshToken은 필수입니다.")
    private String refreshToken;
}
