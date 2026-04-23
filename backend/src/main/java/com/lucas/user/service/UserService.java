package com.lucas.user.service;

import com.lucas.auth.dto.PendingUserInfo;
import com.lucas.auth.dto.response.TokenResponse;
import com.lucas.auth.entity.UserRole;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.user.dto.request.UserRegisterRequest;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 사용자 정보와 관련된 비즈니스 로직을 처리하는 서비스 클래스입니다. */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

  private final UserRepository userRepository;
  private final com.lucas.auth.service.AuthService authService;
  private final com.lucas.global.util.JwtUtil jwtUtil;

  @Value("${spring.jwt.access-token-expiration}")
  private long accessTokenExpiration;

  @Value("${spring.jwt.refresh-token-expiration}")
  private long refreshTokenExpiration;

  /**
   * 가입 대기 중인 사용자의 닉네임을 설정하고 최종적으로 DB에 저장(Insert/Update)합니다.
   *
   * @param request 가입 요청 정보 (tempKey, nickname, guestId)
   * @return 가입 완료 후 발급된 토큰 정보
   */
  @Transactional
  public TokenResponse register(UserRegisterRequest request) {
    // 1. 임시 저장된 유저 정보 조회
    PendingUserInfo pendingInfo = authService.getPendingUserInfo(request.getTempKey());

    User user;
    // 2. 게스트에서 전환하는 경우와 신규 가입하는 경우 분기 처리
    if (request.getGuestId() != null) { // GUEST -> MEMBER 전환
      user = userRepository.findById(request.getGuestId())
          .orElseThrow(() -> new CustomException(ErrorCode.E3000));
      user.upgradeToMember(
          pendingInfo.getEmail(),
          pendingInfo.getOauthName(),
          pendingInfo.getProvider(),
          pendingInfo.getProviderUserId());
    } else if (pendingInfo.isGuest()) { // 신규 게스트 가입 (DB 저장 유예 종료)
      user = User.builder()
          .oauthName(pendingInfo.getOauthName())
          .role(UserRole.GUEST)
          .build();
    } else { // 신규 소셜 가입 (DB 저장 유예 종료)
      user = User.builder()
          .email(pendingInfo.getEmail())
          .oauthName(pendingInfo.getOauthName())
          .provider(pendingInfo.getProvider())
          .providerUserId(pendingInfo.getProviderUserId())
          .role(com.lucas.auth.entity.UserRole.MEMBER)
          .build();
    }

    // 3. 닉네임 설정 및 영속화
    user.updateNickname(request.getNickname());
    User savedUser = userRepository.save(user);

    // 4. Redis 임시 정보 삭제
    authService.deletePendingUserInfo(request.getTempKey());

    // 5. 정규 인증 토큰 발급
    String accessToken = jwtUtil.createAccessToken(
        savedUser.getId(),
        savedUser.getEmail(),
        savedUser.getNickname(),
        savedUser.getProvider(),
        savedUser.getRole().name(),
        accessTokenExpiration);
    String refreshToken = jwtUtil.createRefreshToken(savedUser.getId(), savedUser.getEmail(), refreshTokenExpiration);

    // Refresh Token Redis 등록
    authService.replaceRefreshToken(savedUser.getId(), refreshToken);

    return TokenResponse.builder()
        .accessToken(accessToken)
        .refreshToken(refreshToken)
        .userId(savedUser.getId())
        .role(savedUser.getRole().name())
        .nickname(savedUser.getNickname())
        .build();
  }

  /**
   * 특정 사용자의 닉네임을 유효성 검사 후 업데이트합니다.
   *
   * @param userId 유저 식별값
   * @param nickname 새로운 닉네임 문자열
   * @throws CustomException 닉네임이 비어있거나 너무 길 경우 발생
   */
  @Transactional
  public void updateNickname(Long userId, String nickname) {
    if (nickname == null || nickname.isBlank()) {
      throw new CustomException(ErrorCode.H1000);
    }

    String trimmedNickname = nickname.trim();
    if (trimmedNickname.length() > 50) {
      throw new CustomException(ErrorCode.H1000);
    }

    User user = userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.E3000));

    user.updateNickname(trimmedNickname);
    log.info("유저 닉네임 업데이트 완료 - userId: {}, nickname: {}", userId, trimmedNickname);
  }
}
