package com.lucas.global.handler;

import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

  /**
   * 비즈니스 로직 상의 사용자 정의 예외를 처리합니다.
   *
   * @param e 커스텀 예외 객체
   * @param request HTTP 요청 객체
   * @return RFC 9457 형식의 에러 응답
   */
  @ExceptionHandler(CustomException.class)
  public ResponseEntity<ProblemDetail> handleCustomException(
      CustomException e, HttpServletRequest request) {
    ErrorCode errorCode = e.getErrorCode();
    ProblemDetail problemDetail =
        ProblemDetail.forStatusAndDetail(errorCode.getHttpStatus(), errorCode.getDetail());
    problemDetail.setTitle(errorCode.getTitle());
    problemDetail.setType(URI.create(errorCode.getType()));
    problemDetail.setInstance(URI.create(request.getRequestURI()));
    problemDetail.setProperty("code", errorCode.getCode());

    return ResponseEntity.status(errorCode.getHttpStatus()).body(problemDetail);
  }

  /**
   * @Valid 어노테이션을 통한 입력값 검증 실패 시 발생하는 예외를 처리합니다.
   *
   * @param e 검증 예외 객체
   * @param request HTTP 요청 객체
   * @return 필드별 에러 정보를 포함한 에러 응답
   */
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ProblemDetail> handleValidationException(
      MethodArgumentNotValidException e, HttpServletRequest request) {
    ProblemDetail problemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "요청값 검증에 실패했습니다.");
    problemDetail.setTitle("Invalid request");
    problemDetail.setType(URI.create("/problems/invalid-request"));
    problemDetail.setInstance(URI.create(request.getRequestURI()));
    problemDetail.setProperty("code", "H1000");
    problemDetail.setProperty(
        "errors",
        e.getBindingResult().getFieldErrors().stream()
            .map(
                error ->
                    Map.of(
                        "field", error.getField(),
                        "message", error.getDefaultMessage()))
            .toList());

    return ResponseEntity.badRequest().body(problemDetail);
  }

  /**
   * JSON 파싱 실패 등 요청 본문을 읽을 수 없을 때 발생하는 예외를 처리합니다.
   *
   * @param e 메시지 읽기 예외 객체
   * @param request HTTP 요청 객체
   * @return JSON 형식 오류 메시지
   */
  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ProblemDetail> handleHttpMessageNotReadableException(
      HttpMessageNotReadableException e, HttpServletRequest request) {
    ProblemDetail problemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "요청 본문의 JSON 형식이 올바르지 않습니다.");
    problemDetail.setTitle("Malformed JSON");
    problemDetail.setType(URI.create("/problems/malformed-json"));
    problemDetail.setInstance(URI.create(request.getRequestURI()));
    problemDetail.setProperty("code", "Q1000");

    return ResponseEntity.badRequest().body(problemDetail);
  }

  /**
   * 위에서 정의되지 않은 모든 예외를 처리하는 최상위 핸들러입니다.
   *
   * @param e 예외 객체
   * @param request HTTP 요청 객체
   * @return 서버 내부 오류(500) 응답
   */
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ProblemDetail> handleException(Exception e, HttpServletRequest request) {
    log.error("Unhandled exception", e);

    ProblemDetail problemDetail =
        ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다.");
    problemDetail.setTitle("Internal server error");
    problemDetail.setType(URI.create("/problems/internal-server-error"));
    problemDetail.setInstance(URI.create(request.getRequestURI()));
    problemDetail.setProperty("code", "G1000");

    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problemDetail);
  }
}
