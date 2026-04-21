package com.lucas.auth.oauth;

import java.util.Map;

/** 소셜 로그인 제공자로부터 받은 사용자 정보를 공통으로 관리하기 위한 추상 클래스입니다. */
public abstract class OAuth2UserInfo {
  /** 소셜 제공자가 전달한 속성 맵 */
  protected Map<String, Object> attributes;

  /**
   * @param attributes 소셜 제공자가 전달한 속성 맵
   */
  public OAuth2UserInfo(Map<String, Object> attributes) {
    this.attributes = attributes;
  }

  /**
   * @return 소셜 서비스의 고유 식별값
   */
  public abstract String getId();

  /**
   * @return 사용자 이름
   */
  public abstract String getName();

  /**
   * @return 사용자 이메일
   */
  public abstract String getEmail();
}
