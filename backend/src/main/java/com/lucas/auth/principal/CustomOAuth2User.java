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

  /** 추가 절차(신규 가입의 닉네임 설정 또는 기존 계정으로의 전환 확인)가 필요한 상태인지 여부. */
  private final boolean isPendingRegistration;

  /** 게스트 승격 시도 중 이미 가입된 소셜 계정 발견 여부 */
  private final boolean isConflict;

  /**
   * 동일 이메일로 가입된 User에 새 SocialLogin을 연동(Account Linking)하기 전 사용자 확인이 필요한 상태 여부. true인 경우, 프론트엔드에서
   * 확인 팝업을 표시하고 사용자 동의 후 DB에 저장합니다.
   */
  private final boolean isAccountLinking;

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
   * @param isPendingRegistration 추가 절차 필요 여부 플래그
   * @param isConflict 게스트 승격 시도 중 이미 가입된 계정 발견 여부
   * @param isAccountLinking 동일 이메일 계정 연동 확인 대기 여부
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
      boolean isPendingRegistration,
      boolean isConflict,
      boolean isAccountLinking) {
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
    this.isConflict = isConflict;
    this.isAccountLinking = isAccountLinking;
  }
}
