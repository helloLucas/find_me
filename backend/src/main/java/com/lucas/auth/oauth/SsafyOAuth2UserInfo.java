package com.lucas.auth.oauth;

import java.util.Map;

public class *****OAuth2UserInfo extends OAuth2UserInfo {

  public *****OAuth2UserInfo(Map<String, Object> attributes) {
    super(attributes);
  }

  @Override
  public String getId() {
    return (String) attributes.get("userId");
  }

  @Override
  public String getName() {
    return (String) attributes.get("name");
  }

  @Override
  public String getEmail() {
    return (String) attributes.get("email");
  }
}
