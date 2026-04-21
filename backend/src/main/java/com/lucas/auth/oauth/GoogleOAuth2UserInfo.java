package com.lucas.auth.oauth;

import java.util.Map;

/** 구글 OAuth2 인증을 통해 제공받은 사용자 정보를 매핑하는 클래스입니다. */
public class GoogleOAuth2UserInfo extends OAuth2UserInfo {
  /**
   * 구글 사용자 속성 맵을 사용하여 객체를 생성합니다.
   *
   * @param attributes 사용자 속성 맵
   */
  public GoogleOAuth2UserInfo(Map<String, Object> attributes) {
    super(attributes);
  }

  /**
   * @return 구글 사용자의 고유 식별값 (sub)
   */
  @Override
  public String getId() {
    return (String) attributes.get("sub");
  }

  /**
   * @return 구글 사용자의 이름 (name)
   */
  @Override
  public String getName() {
    return (String) attributes.get("name");
  }

  /**
   * @return 구글 사용자의 이메일 (email)
   */
  @Override
  public String getEmail() {
    return (String) attributes.get("email");
  }
}
