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

/** OAuth2 인증 완료 후, 사용자 정보를 DB와 대조하여 [로그인 / 게스트 -> 멤버 전환 / 신규 가입] 중 하나를 처리하는 서비스 클래스입니다. */
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
        userId == null // userId가 없으면 가입 대기 상태 (닉네임 미입력 상태)
    );
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
   * AuthProvider와 attributes에 들어있는 소셜 로그인의 식별값 id를 통해 회원을 찾아 반환하는 메소드
   * 만약 회원이 없다면 DB 저장을 하지 않고 가입 대기 상태로 반환한다.
   *
   * @param attributes 추출된 OAuth 사용자 속성
   * @param provider   소셜 로그인 제공자
   * @return 조회되거나 가입 대기 중인 정보를 담은 UserContext
   */
  private UserContext getUser(OAuthAttributes attributes, AuthProvider provider) {
    String providerUserId = attributes.getOauth2UserInfo().getId();

    // 1. 이미 가입된 사용자인지 확인
    Optional<User> userOptional = userRepository.findByProviderAndProviderUserId(provider, providerUserId);
    if (userOptional.isPresent()) {
      log.info("기존 회원 로그인 - provider={}, providerUserId={}, userId={}", provider, providerUserId,
          userOptional.get().getId());
      return new UserContext(userOptional.get(), false, false);
    }

    // 2. 가입되지 않았을 경우, 현재 접속 중인 게스트인지 확인
    Long guestId = getCurrentGuestId();
    if (guestId != null) {
      // [GUEST -> MEMBER 전환] Role을 MEMBER로 승격
      Optional<User> guestOptional = userRepository.findById(guestId);
      if (guestOptional.isPresent() && guestOptional.get().getRole() == UserRole.GUEST) {
        User upgradedUser = upgradeGuestToMember(guestOptional.get(), attributes, provider);
        log.info("게스트 -> 회원 승격 완료: userId={}, email={}", upgradedUser.getId(), upgradedUser.getEmail());
        return new UserContext(upgradedUser, false, true);
      }
    }

    // 3. 기존 회원도 아니고, 승격할 게스트 세션도 없다면 신규 가입 대기 (닉네임 설정 필요)
    log.info("신규 회원 가입 대기 중 (DB 미저장) - email={}", attributes.getEmail());
    return new UserContext(null, true, false);
  }

  private record UserContext(User user, boolean isNewUser, boolean isGuest) {
  }

  /**
   * 현재 HTTP 요청에서 게스트 토큰 정보를 파싱하여 게스트 ID를 반환합니다.
   *
   * @return 게스트 유저의 식별값 또는 null
   */
  private Long getCurrentGuestId() {
    try {
      HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();

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
   * @param guest    게스트 유저
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
