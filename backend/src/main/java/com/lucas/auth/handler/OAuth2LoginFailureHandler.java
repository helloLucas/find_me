package com.lucas.auth.handler;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

/** OAuth2 소셜 로그인 실패 시 처리를 담당하는 핸들러 클래스입니다. */
@Slf4j
@Component
public class OAuth2LoginFailureHandler implements AuthenticationFailureHandler {
  @Value("${app.frontend.url}")
  private String frontendUrl;

  /**
   * 인증 실패 시 호출되어 로그를 기록합니다.
   *
   * @param request HTTP 요청 객체
   * @param response HTTP 응답 객체
   * @param exception 발생한 인증 예외
   * @throws IOException 입출력 예외
   * @throws ServletException 서블릿 예외
   */
  @Override
  public void onAuthenticationFailure(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException exception)
      throws IOException, ServletException {
    String errorCode = "oauth2_authentication_failed";
    if (exception instanceof OAuth2AuthenticationException oauthException) {
      errorCode = oauthException.getError().getErrorCode();
    }

    log.warn(
        "OAuth2 로그인 실패 - requestUri={}, errorCode={}, message={}",
        request.getRequestURI(),
        errorCode,
        exception.getMessage(),
        exception);

    String targetUrl =
        UriComponentsBuilder.fromUriString(frontendUrl + "/oauth/callback")
            .queryParam("error", errorCode)
            .encode(StandardCharsets.UTF_8)
            .build()
            .toUriString();

    response.sendRedirect(targetUrl);
  }
}
