package com.lucas.auth.oauth;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.stereotype.Component;

/**
 * OAuth2 인증 요청 상태를 HttpOnly 쿠키에 저장하는 커스텀 구현체입니다.
 *
 * <p>Spring Security의 기본 구현체({@code HttpSessionOAuth2AuthorizationRequestRepository})는 서버 세션을 이용하여
 * OAuth2 상태(state)를 관리합니다. Stateless(JWT) 환경 또는 로드 밸런서가 있는 분산 환경에서는 세션 불일치로 인해 간헐적인 {@code
 * access_denied} 에러가 발생할 수 있습니다.
 *
 * <p>이 클래스는 OAuth2 인증 요청 정보를 Base64+JSON 직렬화하여 쿠키에 저장하고, 콜백 시 쿠키에서 역직렬화하여 세션 없이 상태를 복원합니다.
 */
@Slf4j
@Component
public class HttpCookieOAuth2AuthorizationRequestRepository
    implements AuthorizationRequestRepository<OAuth2AuthorizationRequest> {

  /** OAuth2 인증 요청 정보를 담는 쿠키 이름 */
  public static final String OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME = "oauth2_auth_request";

  /** 쿠키 만료 시간: 3분 */
  private static final int COOKIE_EXPIRE_SECONDS = 180;

  private final ObjectMapper objectMapper = new ObjectMapper();

  /**
   * 쿠키에서 OAuth2 인증 요청 상태를 로드합니다.
   *
   * @param request HTTP 요청
   * @return 쿠키에서 역직렬화된 OAuth2AuthorizationRequest, 없으면 null
   */
  @Override
  public OAuth2AuthorizationRequest loadAuthorizationRequest(HttpServletRequest request) {
    return getCookieValue(request).map(this::deserialize).orElse(null);
  }

  /**
   * OAuth2 인증 요청 상태를 쿠키에 저장합니다. authorizationRequest가 null이면 쿠키를 삭제합니다.
   *
   * @param authorizationRequest 저장할 OAuth2 인증 요청 (null이면 삭제)
   * @param request HTTP 요청
   * @param response HTTP 응답
   */
  @Override
  public void saveAuthorizationRequest(
      OAuth2AuthorizationRequest authorizationRequest,
      HttpServletRequest request,
      HttpServletResponse response) {

    if (authorizationRequest == null) {
      deleteCookie(response);
      return;
    }

    String serialized = serialize(authorizationRequest);
    ResponseCookie cookie =
        ResponseCookie.from(OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME, serialized)
            .httpOnly(true)
            .secure(true)
            .path("/")
            .maxAge(COOKIE_EXPIRE_SECONDS)
            .sameSite("None")
            .build();

    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    log.debug("OAuth2 인증 요청 쿠키 저장 완료");
  }

  /**
   * 쿠키에서 OAuth2 인증 요청 상태를 꺼내고 쿠키를 삭제합니다.
   *
   * @param request HTTP 요청
   * @param response HTTP 응답
   * @return 꺼낸 OAuth2AuthorizationRequest, 없으면 null
   */
  @Override
  public OAuth2AuthorizationRequest removeAuthorizationRequest(
      HttpServletRequest request, HttpServletResponse response) {

    OAuth2AuthorizationRequest authorizationRequest = loadAuthorizationRequest(request);
    if (authorizationRequest != null) {
      deleteCookie(response);
      log.debug("OAuth2 인증 요청 쿠키 제거 완료");
    }
    return authorizationRequest;
  }

  /** 쿠키를 만료시켜 삭제합니다. */
  public void deleteCookies(HttpServletRequest request, HttpServletResponse response) {
    deleteCookie(response);
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private Optional<String> getCookieValue(HttpServletRequest request) {
    if (request.getCookies() == null) return Optional.empty();
    for (Cookie cookie : request.getCookies()) {
      if (OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME.equals(cookie.getName())) {
        return Optional.of(cookie.getValue());
      }
    }
    return Optional.empty();
  }

  /**
   * OAuth2AuthorizationRequest 를 Base64(JSON) 문자열로 직렬화합니다. OAuth2AuthorizationRequest 자체가 직접 직렬화
   * 불가능하므로 필요한 필드만 Map으로 추출합니다.
   */
  private String serialize(OAuth2AuthorizationRequest request) {
    try {
      Map<String, Object> data = new HashMap<>();
      data.put("authorizationUri", request.getAuthorizationUri());
      data.put("clientId", request.getClientId());
      data.put("redirectUri", request.getRedirectUri());
      data.put("scopes", request.getScopes());
      data.put("state", request.getState());
      data.put("additionalParameters", request.getAdditionalParameters());
      data.put("authorizationRequestUri", request.getAuthorizationRequestUri());
      data.put("attributes", request.getAttributes());
      data.put("grantType", request.getGrantType().getValue());

      String json = objectMapper.writeValueAsString(data);
      return Base64.getUrlEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));
    } catch (IOException e) {
      log.error("OAuth2AuthorizationRequest 직렬화 실패", e);
      return null;
    }
  }

  /** Base64(JSON) 쿠키 값을 역직렬화하여 OAuth2AuthorizationRequest 를 복원합니다. */
  @SuppressWarnings("unchecked")
  private OAuth2AuthorizationRequest deserialize(String value) {
    try {
      byte[] decoded = Base64.getUrlDecoder().decode(value);
      Map<String, Object> data =
          objectMapper.readValue(
              new String(decoded, StandardCharsets.UTF_8),
              new TypeReference<Map<String, Object>>() {});

      return OAuth2AuthorizationRequest.authorizationCode()
          .authorizationUri((String) data.get("authorizationUri"))
          .clientId((String) data.get("clientId"))
          .redirectUri((String) data.get("redirectUri"))
          .scopes(
              ((List<String>) data.get("scopes") != null)
                  ? new HashSet<>((List<String>) data.get("scopes"))
                  : Collections.emptySet())
          .state((String) data.get("state"))
          .additionalParameters(
              (Map<String, Object>) data.getOrDefault("additionalParameters", new HashMap<>()))
          .authorizationRequestUri((String) data.get("authorizationRequestUri"))
          .attributes((Map<String, Object>) data.getOrDefault("attributes", new HashMap<>()))
          .build();
    } catch (Exception e) {
      log.error("OAuth2AuthorizationRequest 역직렬화 실패 - 쿠키가 손상되었을 수 있습니다.", e);
      return null;
    }
  }

  private void deleteCookie(HttpServletResponse response) {
    ResponseCookie expiredCookie =
        ResponseCookie.from(OAUTH2_AUTHORIZATION_REQUEST_COOKIE_NAME, "")
            .httpOnly(true)
            .secure(true)
            .path("/")
            .maxAge(0)
            .sameSite("None")
            .build();
    response.addHeader(HttpHeaders.SET_COOKIE, expiredCookie.toString());
  }
}
