package com.lucas.user.controller;

import com.lucas.auth.principal.CustomOAuth2User;
import com.lucas.global.dto.BaseResponse;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.user.dto.request.NicknameRequest;
import com.lucas.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * 최초 OAuth 로그인 사용자(GUEST)를 위한 닉네임 등록 API
     */
    @PostMapping("/nickname")
    public ResponseEntity<BaseResponse<Void>> registerNickname(@AuthenticationPrincipal CustomOAuth2User customOAuth2User,
                                                              @Valid @RequestBody NicknameRequest request) {
        if (customOAuth2User == null) {
            throw new CustomException(ErrorCode.E1000); // 인증 정보 없음
        }

        userService.registerNickname(customOAuth2User.getUserId(), request.getNickname());

        return ResponseEntity.ok(BaseResponse.success("닉네임이 성공적으로 등록되었으며, 가입이 완료되었습니다."));
    }
}
