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

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemDetail> handleHttpMessageNotReadableException(
            HttpMessageNotReadableException e, HttpServletRequest request) {
        ProblemDetail problemDetail =
                ProblemDetail.forStatusAndDetail(
                        HttpStatus.BAD_REQUEST, "요청 본문의 JSON 형식이 올바르지 않습니다.");
        problemDetail.setTitle("Malformed JSON");
        problemDetail.setType(URI.create("/problems/malformed-json"));
        problemDetail.setInstance(URI.create(request.getRequestURI()));
        problemDetail.setProperty("code", "Q1000");

        return ResponseEntity.badRequest().body(problemDetail);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleException(Exception e, HttpServletRequest request) {
        log.error("Unhandled exception", e);

        ProblemDetail problemDetail =
                ProblemDetail.forStatusAndDetail(
                        HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다.");
        problemDetail.setTitle("Internal server error");
        problemDetail.setType(URI.create("/problems/internal-server-error"));
        problemDetail.setInstance(URI.create(request.getRequestURI()));
        problemDetail.setProperty("code", "G1000");

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problemDetail);
    }
}
