package com.lucas.user.controller;

import com.lucas.auth.dto.response.TokenResponse;
import com.lucas.auth.principal.CustomUserPrincipal;
import com.lucas.global.dto.BaseResponse;
import com.lucas.global.util.CookieUtil;
import com.lucas.global.util.JwtUtil;
import com.lucas.user.dto.request.NicknameRequest;
import com.lucas.user.dto.request.UserRegisterRequest;
import com.lucas.user.dto.response.UserResponseDto;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import com.lucas.user.service.UserService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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
  private final CookieUtil cookieUtil;

  @Value("${spring.jwt.access-token-expiration}")
  private long accessTokenExpiration;

  /**
   * 신규 회원 가입 또는 게스트의 정식 회원 전환을 완료합니다.
   * Redis에 임시 저장된 정보를 기반으로 DB에 유저 데이터를 생성(Insert)하거나 전환(Update)합니다.
   *
   * @param request 가입 요청 정보 (tempKey, nickname, guestId)
   * @return 가입 완료 성공 메시지와 함께 발급된 토큰 세트 (Access, Refresh)
   */
  @PostMapping("/register")
  public ResponseEntity<BaseResponse<TokenResponse>> register(
      @Valid @RequestBody UserRegisterRequest request, HttpServletResponse response) {

    TokenResponse tokenResponse = userService.register(request);

    // Refresh Token을 HttpOnly 쿠키에 저장하여 XSS 방지
    cookieUtil.setRefreshTokenCookie(response, tokenResponse.getRefreshToken());

    return ResponseEntity.ok(BaseResponse.success("회원 가입이 완료되었습니다.", tokenResponse));
  }

  /**
   * 현재 로그인한 사용자의 닉네임을 수정합니다. GUEST와 MEMBER 권한을 가진 모든 인증된 사용자가 접근 가능합니다.
   * 수정 성공 시, 변경된 닉네임이 반영된 새로운 Access Token을 반환합니다.
   *
   * @param principal 인증된 사용자의 정보
   * @param request 수정할 닉네임 정보가 담긴 DTO
   * @return 성공 메시지와 새로운 Access Token
   */
  @PatchMapping("/nickname")
  public ResponseEntity<BaseResponse<Map<String, String>>> updateNickname(
      @AuthenticationPrincipal CustomUserPrincipal principal,
      @Valid @RequestBody NicknameRequest request) {

    UserResponseDto userDto = userService.updateNickname(principal.getUserId(), request.getNickname());

    // 새로운 Access Token 생성 (새 닉네임 포함)
    String newAccessToken = jwtUtil.createAccessToken(
        userDto.id(),
        userDto.email(),
        userDto.nickname(),
        userDto.provider(),
        userDto.role(),
        accessTokenExpiration);

    Map<String, String> data = new HashMap<>();
    data.put("accessToken", newAccessToken);

    return ResponseEntity.ok(BaseResponse.success("닉네임이 성공적으로 수정되었습니다.", data));
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
    UserResponseDto userDto = userService.getUserProfile(principal.getUserId());

    Map<String, Object> data = new HashMap<>();
    data.put("id", userDto.id());
    data.put("nickname", userDto.nickname());
    data.put("role", userDto.role());

    return ResponseEntity.ok(BaseResponse.success("내 정보를 조회했습니다.", data));
  }
}
