package com.lucas.user.controller;

import com.lucas.auth.principal.CustomUserPrincipal;
import com.lucas.global.dto.BaseResponse;
import com.lucas.global.util.JwtUtil;
import com.lucas.user.dto.request.NicknameRequest;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import com.lucas.user.service.UserService;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** 사용자 정보 관리를 위한 API를 제공하는 컨트롤러 클래스입니다. 닉네임 수정, 내 정보 조회 등의 기능을 제공합니다. */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final UserService userService;

    /**
     * 현재 로그인한 사용자의 닉네임을 수정합니다. GUEST와 MEMBER 권한을 가진 모든 인증된 사용자가 접근 가능합니다.
     *
     * @param principal 인증된 사용자의 정보
     * @param request 수정할 닉네임 정보가 담긴 DTO
     * @return 성공 메시지
     */
    @PatchMapping("/nickname")
    public ResponseEntity<BaseResponse<Void>> updateNickname(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @Valid @RequestBody NicknameRequest request) {

        userService.updateNickname(principal.getUserId(), request.getNickname());
        return ResponseEntity.ok(BaseResponse.success("닉네임이 성공적으로 수정되었습니다."));
    }

    /**
     * 현재 로그인한 사용자의 프로필 정보를 조회합니다.
     *
     * @param principal 인증된 사용자의 정보
     * @return 유저의 ID, 닉네임, 권한 정보를 포함한 응답 객체
     */
    @GetMapping("/me")
    public ResponseEntity<BaseResponse<Map<String, Object>>> getMe(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        User user =
                userRepository
                        .findById(principal.getUserId())
                        .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다."));

        Map<String, Object> data = new HashMap<>();
        data.put("id", user.getId());
        data.put("nickname", user.getNickname());
        data.put("role", user.getRole().name());

        return ResponseEntity.ok(BaseResponse.success("내 정보를 조회했습니다.", data));
    }
}
