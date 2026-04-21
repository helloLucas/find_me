package com.lucas.auth.handler;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;

/** OAuth2 소셜 로그인 실패 시 처리를 담당하는 핸들러 클래스입니다. */
@Slf4j
public class OAuth2LoginFailureHandler implements AuthenticationFailureHandler {
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
    log.info("소셜 로그인에 실패했습니다. 에러 메시지 : {}", exception.getMessage());
  }
}
