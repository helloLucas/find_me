package com.lucas.user.service;

import com.lucas.auth.dto.PendingUserInfo;
import com.lucas.auth.dto.response.TokenResponse;
import com.lucas.auth.entity.AuthProvider;
import com.lucas.auth.entity.SocialLogin;
import com.lucas.auth.entity.UserRole;
import com.lucas.auth.repository.SocialLoginRepository;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.user.dto.request.UserRegisterRequest;
import com.lucas.user.dto.response.UserResponseDto;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import java.util.Optional;
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
  private final SocialLoginRepository socialLoginRepository;
  private final com.lucas.auth.service.AuthService authService;
  private final com.lucas.global.util.JwtUtil jwtUtil;

  @Value("${spring.jwt.access-token-expiration}")
  private long accessTokenExpiration;

  @Value("${spring.jwt.refresh-token-expiration}")
  private long refreshTokenExpiration;

  /**
   * 가입 대기 중인 사용자의 닉네임을 설정하고 최종적으로 DB에 저장(Insert/Update)합니다.
   *
   * <p>User(본체)와 SocialLogin(인증 수단)을 분리하여 저장하므로, 가입 완료 시 두 레코드가 함께 생성됩니다.
   *
   * @param request 가입 요청 정보 (tempKey, nickname, guestId)
   * @return 가입 완료 후 발급된 토큰 정보
   */
  @Transactional
  public TokenResponse register(UserRegisterRequest request) {
    // 1. Redis에서 임시 사용자 정보 조회
    PendingUserInfo pendingInfo = authService.getPendingUserInfo(request.getTempKey());

    // 닉네임 누락 (신규 회원 가입 or 순수 게스트 가입일 때는 닉네임 필수)
    // 단, 기존 게스트에서 소셜로 승격하는 경우(guestId != null)는 DB의 기존 닉네임을 사용하므로 예외
    boolean isUpgrade = request.getGuestId() != null;
    if (!request.isConfirmSwitch()
        && !isUpgrade
        && !request.isConfirmAccountLinking()
        && (request.getNickname() == null || request.getNickname().isBlank())) {
      log.warn("닉네임 누락 - 가입 제한");
      throw new CustomException(ErrorCode.H1000);
    }

    try {
      // [계정 연동(Account Linking) 확인] 사용자가 팝업에서 확인 버튼을 누른 경우
      if (request.isConfirmAccountLinking()) {
        User existingUser = userRepository
            .findByEmailWithSocialLogins(pendingInfo.getEmail())
            .orElseThrow(() -> new CustomException(ErrorCode.E3000));

        // 중복 연동 방지: 이미 연동되어 있으면 그대로 반환
        boolean alreadyLinked = socialLoginRepository
            .findByProviderAndProviderUserId(pendingInfo.getProvider(), pendingInfo.getProviderUserId())
            .isPresent();

        if (!alreadyLinked) {
          SocialLogin newSocialLogin = SocialLogin.builder()
              .user(existingUser)
              .provider(pendingInfo.getProvider())
              .providerUserId(pendingInfo.getProviderUserId())
              .build();
          socialLoginRepository.save(newSocialLogin);
          log.info("계정 연동(Account Linking) 완료 - userId={}, provider={}",
              existingUser.getId(), pendingInfo.getProvider());
        }

        return issueTokensForUser(existingUser);
      }

      // 소셜 정보가 있는 경우에만 DB 조회
      Optional<SocialLogin> socialLoginOpt = Optional.empty();
      if (pendingInfo.getProvider() != null) {
        socialLoginOpt = socialLoginRepository.findByProviderAndProviderUserId(
            pendingInfo.getProvider(),
            pendingInfo.getProviderUserId());
      }

      User user;

      // 2. 가입하려는 소셜 계정이 이미 존재하는 경우 처리
      if (socialLoginOpt.isPresent()) {
        User socialUser = socialLoginOpt.get().getUser();

        if (!request.isConfirmSwitch()) {
          log.warn(
              "이미 가입된 소셜 계정 - 가입 제한: provider={}, providerUserId={}",
              pendingInfo.getProvider(),
              pendingInfo.getProviderUserId());
          throw new CustomException(ErrorCode.H1000); // "이미 가입된 소셜 계정입니다."
        }

        // 전환 확인 시 기존 멤버 정보 반환
        log.info("계정 전환 승인 - 기존 멤버 세션 사용: userId={}", socialUser.getId());
        return issueTokensForUser(socialUser); // DB에서 찾은 기존 유저의 정보로 토큰을 발급
      }

      // 3. 상황별 유저 엔티티 준비 (승격 또는 신규 생성)
      if (request.getGuestId() != null) { // GUEST -> MEMBER 승격 (신규 소셜 계정 사용)
        user = userRepository
            .findById(request.getGuestId())
            .orElseThrow(() -> new CustomException(ErrorCode.E3000));

        user.upgradeToMember(pendingInfo.getEmail(), pendingInfo.getOauthName());

      } else if (pendingInfo.isGuest()) { // 닉네임만 있는 순수 게스트 가입 (닉네임 설정 완료 시점)
        user = User.builder()
            .nickname(request.getNickname())
            .role(UserRole.GUEST)
            .build();

      } else { // 아예 처음인 신규 소셜 회원 가입 (닉네임 설정 완료 시점)
        user = User.builder()
            .email(pendingInfo.getEmail())
            .oauthName(pendingInfo.getOauthName())
            .nickname(request.getNickname())
            .role(UserRole.MEMBER)
            .build();
      }

      User savedUser = userRepository.save(user);

      // 4. SocialLogin 레코드 생성 (소셜 정보가 있는 경우에만)
      if (pendingInfo.getProvider() != null && pendingInfo.getProviderUserId() != null) {
        SocialLogin socialLogin = SocialLogin.builder()
            .user(savedUser)
            .provider(pendingInfo.getProvider())
            .providerUserId(pendingInfo.getProviderUserId())
            .build();
        socialLoginRepository.save(socialLogin);
        log.info(
            "SocialLogin 레코드 생성 완료: userId={}, provider={}",
            savedUser.getId(),
            pendingInfo.getProvider());
      }

      log.info("회원 가입/승격 완료: userId={}, email={}", savedUser.getId(), savedUser.getEmail());

      // 5. 토큰 발급
      return issueTokensForUser(savedUser);

    } finally {
      // 6. 성공/실패 여부와 무관하게 Redis 임시 데이터 반드시 삭제
      authService.deletePendingUserInfo(request.getTempKey());
    }

  }

  /** 유저를 위한 토큰 세트를 발급합니다. */
  private TokenResponse issueTokensForUser(User user) {
    // provider 정보는 SocialLogin에서 첫 번째 연동 수단을 사용하거나 null 허용
    AuthProvider provider =
        user.getSocialLogins().isEmpty() ? null : user.getSocialLogins().get(0).getProvider();

    String accessToken =
        jwtUtil.createAccessToken(
            user.getId(),
            user.getEmail(),
            user.getNickname(),
            provider,
            user.getRole().name(),
            accessTokenExpiration);

    String refreshToken =
        jwtUtil.createRefreshToken(user.getId(), user.getEmail(), refreshTokenExpiration);
    authService.replaceRefreshToken(user.getId(), refreshToken);

    return TokenResponse.builder()
        .accessToken(accessToken)
        .refreshToken(refreshToken)
        .userId(user.getId())
        .role(user.getRole().name())
        .nickname(user.getNickname())
        .isNewUser(false) // 가입이 완료된 상태이므로 false
        .build();
  }

  /**
   * 특정 사용자의 닉네임을 유효성 검사 후 업데이트하고 DTO로 반환합니다.
   *
   * @param userId   유저 식별값
   * @param nickname 새로운 닉네임 문자열
   * @return 업데이트된 유저 정보를 담은 DTO
   * @throws CustomException 닉네임이 비어있거나 너무 길 경우 발생
   */
  @Transactional
  public UserResponseDto updateNickname(Long userId, String nickname) {
    if (nickname == null || nickname.isBlank()) {
      throw new CustomException(ErrorCode.H1000);
    }

    String trimmedNickname = nickname.trim();
    if (trimmedNickname.length() > 50) {
      throw new CustomException(ErrorCode.H1000);
    }

    // socialLogins를 Fetch Join으로 함께 로드하여 LazyInitializationException 및 N+1 방지
    User user =
        userRepository
            .findByIdWithSocialLogins(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.E3000));

    user.updateNickname(trimmedNickname);
    log.info("유저 닉네임 업데이트 완료 - userId: {}, nickname: {}", userId, trimmedNickname);

    AuthProvider provider =
        user.getSocialLogins().isEmpty() ? null : user.getSocialLogins().get(0).getProvider();

    return new UserResponseDto(
        user.getId(),
        user.getEmail(),
        user.getNickname(),
        user.getRole().name(),
        provider);
  }

  /**
   * 특정 사용자의 프로필 정보를 조회하여 DTO로 반환합니다.
   *
   * @param userId 유저 식별값
   * @return 유저 정보를 담은 DTO
   */
  @Transactional(readOnly = true)
  public UserResponseDto getUserProfile(Long userId) {
    // socialLogins를 Fetch Join으로 함께 로드하여 LazyInitializationException 및 N+1 방지
    User user =
        userRepository
            .findByIdWithSocialLogins(userId)
            .orElseThrow(() -> new IllegalArgumentException("유저를 찾을 수 없습니다."));

    AuthProvider provider =
        user.getSocialLogins().isEmpty() ? null : user.getSocialLogins().get(0).getProvider();

    return new UserResponseDto(
        user.getId(),
        user.getEmail(),
        user.getNickname(),
        user.getRole().name(),
        provider);
  }
}
