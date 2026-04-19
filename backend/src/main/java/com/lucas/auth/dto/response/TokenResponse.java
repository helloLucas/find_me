package com.lucas.auth.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TokenResponse {

    private String accessToken;
    private String refreshToken;

    private Long userId;
    private String role;
    private String nickname;
}
