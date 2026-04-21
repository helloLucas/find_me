package com.lucas.global.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lucas.auth.entity.UserRole;
import com.lucas.auth.principal.CustomUserPrincipal;
import com.lucas.global.dto.BaseResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private static final String LOCAL_DEV_BYPASS_TOKEN = "local-dev-bypass-token";
  private static final Long LOCAL_DEV_USER_ID = 1L;

  private final JwtUtil jwtUtil;

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {

    String authorization = request.getHeader("Authorization");

    if (authorization == null || !authorization.startsWith("Bearer ")) {
      filterChain.doFilter(request, response);
      return;
    }

    // "Bearer " 제거
    String token = authorization.substring(7);

    try {
      if (isDevAuthBypassToken(token)) {
        authenticateDevUser();
        filterChain.doFilter(request, response);
        return;
      }

      if (jwtUtil.isExpired(token)) {
        sendErrorResponse(response, HttpStatus.UNAUTHORIZED, "만료된 JWT 토큰입니다.");
        return;
      }

      String category = jwtUtil.getCategory(token);
      if (!"access".equals(category)) {
        filterChain.doFilter(request, response);
        return;
      }

      Long userId = jwtUtil.getUserId(token);
      String email = jwtUtil.getEmail(token);
      String role = jwtUtil.getRole(token);
      String nickname = jwtUtil.getNickname(token);

      CustomUserPrincipal principal =
          CustomUserPrincipal.builder()
              .userId(userId)
              .email(email)
              .nickname(nickname)
              .role(UserRole.valueOf(role))
              .build();

      UsernamePasswordAuthenticationToken authToken =
          new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

      SecurityContextHolder.getContext().setAuthentication(authToken);

    } catch (Exception e) {
      SecurityContextHolder.clearContext();
      sendErrorResponse(response, HttpStatus.UNAUTHORIZED, "유효하지 않은 JWT 토큰입니다.");
      return;
    }

    filterChain.doFilter(request, response);
  }

  private boolean isDevAuthBypassToken(String token) {
    // TODO: Remove this temporary local-dev auth bypass when the login page flow is completed.
    return LOCAL_DEV_BYPASS_TOKEN.equals(token);
  }

  private void authenticateDevUser() {
    CustomUserPrincipal principal =
        CustomUserPrincipal.builder()
            .userId(LOCAL_DEV_USER_ID)
            .email("local-dev@lucas.test")
            .nickname("local-dev")
            .role(UserRole.GUEST)
            .build();

    UsernamePasswordAuthenticationToken authToken =
        new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

    SecurityContextHolder.getContext().setAuthentication(authToken);
  }

  private void sendErrorResponse(HttpServletResponse response, HttpStatus status, String message)
      throws IOException {
    response.setStatus(status.value());
    response.setContentType("application/json;charset=UTF-8");

    BaseResponse<Void> baseResponse = BaseResponse.fail("E1000", message);
    ObjectMapper objectMapper = new ObjectMapper();
    response.getWriter().write(objectMapper.writeValueAsString(baseResponse));
  }
}
