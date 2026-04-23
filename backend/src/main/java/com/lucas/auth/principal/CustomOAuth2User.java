package com.lucas.auth.principal;

import com.lucas.auth.entity.AuthProvider;
import com.lucas.auth.entity.UserRole;
import java.util.Collection;
import java.util.Map;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

/**
 * OAuth2 로그인 성공 직후 Spring Security에서 관리하는 사용자 정보 객체입니다. JWT 발급 시 사용되며, SecurityContext 내에서 인증
 * 주체(Principal)로 활용됩니다.
 */
@Getter
public class CustomOAuth2User extends DefaultOAuth2User {

  /** 애플리케이션 내부 유저 식별값 */
  private final Long userId;

  /** 유저 이메일 */
  private final String email;

  /** 유저 닉네임 */
  private String nickname;

  /** 소셜 로그인 제공자 */
  private final AuthProvider provider;

  /** 소셜 제공자에서 부여한 유저 고유 ID */
  private final String providerUserId;

  /** 유저 권한 */
  private final UserRole role;

  /** 신규 가입자 여부 */
  private final boolean isNewUser;

  /** 게스트 계승(전환) 여부 */
  private final boolean isGuest;

  /** 닉네임 입력 대기 중인 임시 유저 여부 (DB 저장 전) */
  private final boolean isPendingRegistration;

  /**
   * @param authorities Spring Security 권한 목록
   * @param attributes OAuth 제공자(Google 등)가 준 원본 사용자 정보
   * @param nameAttributeKey OAuth 사용자 대표 식별 키 이름 (예: Google의 sub)
   * @param userId 애플리케이션 내부 유저 ID
   * @param email 사용자 이메일
   * @param nickname 사용자 닉네임
   * @param provider 인증 제공자
   * @param providerUserId 제공자 측 식별값
   * @param role 사용자 권한
   * @param isNewUser 신규 가입 여부 플래그
   * @param isGuest 게스트 승격 여부 플래그
   * @param isPendingRegistration 닉네임 입력 대기 여부 플래그
   */
  public CustomOAuth2User(
      Collection<? extends GrantedAuthority> authorities,
      Map<String, Object> attributes,
      String nameAttributeKey,
      Long userId,
      String email,
      String nickname,
      AuthProvider provider,
      String providerUserId,
      UserRole role,
      boolean isNewUser,
      boolean isGuest,
      boolean isPendingRegistration) {
    super(authorities, attributes, nameAttributeKey);
    this.userId = userId;
    this.email = email;
    this.nickname = nickname;
    this.provider = provider;
    this.providerUserId = providerUserId;
    this.role = role;
    this.isNewUser = isNewUser;
    this.isGuest = isGuest;
    this.isPendingRegistration = isPendingRegistration;
  }
}
