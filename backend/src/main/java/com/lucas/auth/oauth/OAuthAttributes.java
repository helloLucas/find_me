package com.lucas.auth.oauth;

import com.lucas.auth.entity.AuthProvider;
import com.lucas.auth.entity.UserRole;
import com.lucas.user.entity.User;
import java.util.Map;
import lombok.Builder;
import lombok.Getter;

/** 각 소셜 제공자로부터 받아오는 데이터를 공통 형식으로 변환하고 분기 처리하는 DTO 클래스입니다. */
@Getter
public class OAuthAttributes {
  /** OAuth2 로그인 진행 시 키가 되는 필드 값 (PK와 같은 의미) */
  private String nameAttributeKey;

  /** 소셜 타입별로 매핑된 로그인 유저 정보 */
  private OAuth2UserInfo oauth2UserInfo;

  @Builder
  private OAuthAttributes(String nameAttributeKey, OAuth2UserInfo oauth2UserInfo) {
    this.nameAttributeKey = nameAttributeKey;
    this.oauth2UserInfo = oauth2UserInfo;
  }

  /**
   * AuthProvider에 맞는 속성 변환 객체를 생성하여 반환합니다.
   *
   * @param provider 소셜 로그인 제공자
   * @param userNameAttributeName OAuth2 로그인 시 키(PK)가 되는 속성명
   * @param attributes OAuth 서비스가 제공하는 유저 정보 속성 맵
   * @return 소셜 제공자에 맞게 구성된 OAuthAttributes 객체
   */
  public static OAuthAttributes of(
      AuthProvider provider, String userNameAttributeName, Map<String, Object> attributes) {

    if (provider == AuthProvider.SSAFY) {
      return ofSsafy(userNameAttributeName, attributes);
    }
    return ofGoogle(userNameAttributeName, attributes);
  }

  private static OAuthAttributes ofSsafy(
      String userNameAttributeName, Map<String, Object> attributes) {
    return OAuthAttributes.builder()
        .nameAttributeKey(userNameAttributeName)
        .oauth2UserInfo(new SsafyOAuth2UserInfo(attributes))
        .build();
  }

  /**
   * 구글 사용자 정보를 바탕으로 OAuthAttributes 객체를 생성합니다.
   *
   * @param userNameAttributeName 구글의 식별값 키 이름
   * @param attributes 사용자 속성 맵
   * @return 구글 데이터가 매핑된 OAuthAttributes 객체
   */
  public static OAuthAttributes ofGoogle(
      String userNameAttributeName, Map<String, Object> attributes) {
    return OAuthAttributes.builder()
        .nameAttributeKey(userNameAttributeName)
        .oauth2UserInfo(new GoogleOAuth2UserInfo(attributes))
        .build();
  }

  /**
   * 추출된 사용자 정보를 바탕으로 User 엔티티 객체를 생성합니다.
   *
   * 신규 가입 사용자의 초기 역할은 MEMBER이며, 인증 수단(SocialLogin)은 별도로 생성해야 합니다.
   *
   * @param oauth2UserInfo 소셜 타입별 유저 정보
   * @return 생성된 User 엔티티 객체
   */
  public User toEntity(OAuth2UserInfo oauth2UserInfo) {
    return User.builder()
        .email(oauth2UserInfo.getEmail())
        .oauthName(oauth2UserInfo.getName())
        .role(UserRole.MEMBER)
        .build();
  }

  /**
   * @return 사용자 이메일 정보
   */
  public String getEmail() {
    return this.oauth2UserInfo.getEmail();
  }
}
