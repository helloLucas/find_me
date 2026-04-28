package com.lucas.auth.service;

import com.lucas.auth.entity.AuthProvider;
import com.lucas.auth.entity.UserRole;
import com.lucas.auth.oauth.OAuthAttributes;
import com.lucas.auth.principal.CustomOAuth2User;
import com.lucas.global.util.JwtUtil;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * OAuth2 인증 완료 후, 사용자 정보를 DB와 대조하여 [로그인 / 게스트 -> 멤버 전환 / 신규 가입] 중 하나를 처리하는 서비스
 * 클래스입니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {
  private final UserRepository userRepository;
  private final JwtUtil jwtUtil;

  /**
   * OAuth2 로그인 요청을 처리하여 인증된 사용자의 정보를 로드합니다.
   *
   * @param userRequest OAuth2 사용자 요청 정보
   * @return 인증된 사용자 정보를 담은 OAuth2User 객체
   * @throws OAuth2AuthenticationException OAuth2 인증 과정에서 오류 발생 시
   */
  @Override
  public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
    log.info("CustomOAuth2UserService.loadUser() 실행 - OAuth2 로그인 요청 진입");

    OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate = new DefaultOAuth2UserService();
    OAuth2User oAuth2User = delegate.loadUser(userRequest);

    String registrationId = userRequest.getClientRegistration().getRegistrationId();
    AuthProvider provider = getAuthProvider(registrationId);
    String userNameAttributeName = userRequest
        .getClientRegistration()
        .getProviderDetails()
        .getUserInfoEndpoint()
        .getUserNameAttributeName(); // OAuth2 로그인 시 키(PK)가 되는 값

    Map<String, Object> attributes = oAuth2User.getAttributes(); // 소셜 로그인에서 API가 제공하는 userInfo의 Json 값

    // provider에 따라 유저 정보를 통해 OAuthAttributes 객체 생성
    OAuthAttributes extractAttributes = OAuthAttributes.of(provider, userNameAttributeName, attributes);

    UserContext context = getUser(extractAttributes, provider);
    User user = context.user();

    // User가 null인 경우는 신규 가입 대기 상태
    Long userId = (user != null) ? user.getId() : null;
    String nickname = (user != null) ? user.getNickname() : null;
    UserRole role = (user != null) ? user.getRole() : UserRole.MEMBER;

    return new CustomOAuth2User(
        Collections.singleton(new SimpleGrantedAuthority(role.getKey())),
        attributes,
        extractAttributes.getNameAttributeKey(),
        userId,
        extractAttributes.getEmail(),
        nickname,
        provider,
        extractAttributes.getOauth2UserInfo().getId(),
        role,
        context.isNewUser(),
        context.isGuest(),
        context.isNewUser() || context.isConflict(), // 가입 또는 전환 대기 시 true
        context.isConflict());
  }

  /**
   * registrationId를 기반으로 AuthProvider를 반환합니다.
   *
   * @param registrationId 소셜 로그인 제공자 ID
   * @return 매칭되는 AuthProvider
   * @throws OAuth2AuthenticationException 지원하지 않는 제공자일 경우 발생
   */
  private AuthProvider getAuthProvider(String registrationId) {
    if ("google".equalsIgnoreCase(registrationId)) {
      return AuthProvider.GOOGLE;
    } else if ("ssafy".equalsIgnoreCase(registrationId)) {
      return AuthProvider.SSAFY;
    }
    throw new OAuth2AuthenticationException("지원하지 않는 OAuth Provider 입니다: " + registrationId);
  }

  /**
   * 소셜 정보와 현재 게스트 세션을 조합하여 사용자 상태를 판별합니다.
   *
   * @param attributes 추출된 OAuth 사용자 속성
   * @param provider   소셜 로그인 제공자
   * @return 조회되거나 가입 대기 중인 정보를 담은 UserContext
   */
  private UserContext getUser(OAuthAttributes attributes, AuthProvider provider) {
    String providerUserId = attributes.getOauth2UserInfo().getId();
    Optional<User> socialUserOpt = userRepository.findByProviderAndProviderUserId(provider, providerUserId);
    Long guestId = getCurrentGuestId();

    // 소셜 계정이 이미 존재하는 경우
    if (socialUserOpt.isPresent()) {
      User socialUser = socialUserOpt.get();
      if (guestId != null) {
        // 현재 게스트로 접속 O -> 전환 의사 확인
        log.info("계정 전환 대기 (충돌) - socialUserId={}, guestId={}", socialUser.getId(), guestId);
        return new UserContext(socialUser, false, true, true);
      }
      // 현재 게스트로 접속 X -> 일반 로그인
      log.info("기존 회원 로그인 - userId={}", socialUser.getId());
      return new UserContext(socialUser, false, false, false);
    }

    // 소셜 계정은 없는데 게스트 세션은 있는 경우 -> GUEST -> MEMBER 전환
    if (guestId != null) {
      Optional<User> guestOpt = userRepository.findById(guestId);
      if (guestOpt.isPresent() && guestOpt.get().getRole() == UserRole.GUEST) {
        log.info("게스트 승격 대기 (자동) - guestId={}", guestId);
        return new UserContext(guestOpt.get(), true, true, false);
      }
    }

    // 소셜 계정도 없고 게스트 세션도 없는 경우 -> 신규 가입
    log.info("신규 회원 가입 대기 - email={}", attributes.getEmail());
    return new UserContext(null, true, false, false);
  }

  private record UserContext(User user, boolean isNewUser, boolean isGuest, boolean isConflict) {
  }

  /**
   * 현재 HTTP 요청에서 게스트 토큰 정보를 파싱하여 게스트 ID를 반환합니다.
   *
   * @return 게스트 유저의 식별값 또는 null
   */
  private Long getCurrentGuestId() {
    try {
      HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes())
          .getRequest();

      if (request.getCookies() != null) {
        for (Cookie cookie : request.getCookies()) {
          // HttpOnly로 발급된 refresh_token을 통해 guest 여부 식별
          if ("refresh_token".equals(cookie.getName())) {
            return jwtUtil.getUserId(cookie.getValue());
          }
        }
      }
    } catch (Exception e) {
      log.debug("현재 요청에서 인증(Refresh) 쿠키가 발견되지 않았습니다.");
    }
    return null;
  }

  /**
   * 기존 게스트 레코드를 소셜 정보를 포함한 회원(MEMBER) 레코드로 승격시킵니다.
   *
   * @param guest      게스트 유저
   * @param attributes 소셜 로그인 사용자 속성
   * @param provider   소셜 로그인 제공자
   * @return 승격된 User 객체
   */
  private User upgradeGuestToMember(User guest, OAuthAttributes attributes, AuthProvider provider) {
    log.info("게스트 -> 멤버 전환 시도 - guestId={}, email={}", guest.getId(), attributes.getEmail());

    // 게스트의 정보를 회원 정보로 덮어쓰고 role을 MEMBER로 전환
    guest.upgradeToMember(
        attributes.getEmail(),
        attributes.getOauth2UserInfo().getName(),
        provider,
        attributes.getOauth2UserInfo().getId());

    return userRepository.save(guest);
  }
}
