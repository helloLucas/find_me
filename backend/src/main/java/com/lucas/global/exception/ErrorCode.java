package com.lucas.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    H1000(
            "H1000",
            HttpStatus.BAD_REQUEST,
            "Invalid request",
            "요청 파라미터가 올바르지 않습니다.",
            "/problems/invalid-request"),
    E1000("E1000", HttpStatus.UNAUTHORIZED, "Unauthorized", "인증이 필요합니다.", "/problems/unauthorized"),
    E1001("E1001", HttpStatus.FORBIDDEN, "Forbidden", "접근 권한이 없습니다.", "/problems/forbidden"),
    E3000(
            "E3000",
            HttpStatus.NOT_FOUND,
            "User not found",
            "사용자를 찾을 수 없습니다.",
            "/problems/user-not-found"),
    E3001(
            "E3001",
            HttpStatus.NOT_FOUND,
            "Chapter not found",
            "챕터를 찾을 수 없습니다.",
            "/problems/chapter-not-found"),
    E3002(
            "E3002",
            HttpStatus.NOT_FOUND,
            "Story node not found",
            "스토리 노드를 찾을 수 없습니다.",
            "/problems/story-node-not-found"),
    E3003(
            "E3003",
            HttpStatus.NOT_FOUND,
            "Progress not found",
            "진행 상태를 찾을 수 없습니다.",
            "/problems/progress-not-found"),
    A1000(
            "A1000",
            HttpStatus.BAD_REQUEST,
            "Invalid player input",
            "입력한 명령어 형식이 올바르지 않습니다.",
            "/problems/invalid-player-input"),
    A1001(
            "A1001",
            HttpStatus.CONFLICT,
            "Transition not allowed",
            "현재 상태에서는 해당 동작을 수행할 수 없습니다.",
            "/problems/transition-not-allowed"),
    A1002(
            "A1002",
            HttpStatus.FORBIDDEN,
            "Previous chapter not completed",
            "이전 챕터를 완료해야 진행할 수 있습니다.",
            "/problems/prev-chapter-incomplete"),
    A2000(
            "A2000",
            HttpStatus.FORBIDDEN,
            "Guest save not allowed",
            "게스트 계정은 저장 기능을 사용할 수 없습니다.",
            "/problems/guest-save-not-allowed"),
    G1000(
            "G1000",
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Internal server error",
            "서버 내부 오류가 발생했습니다.",
            "/problems/internal-server-error"),
    Q1000(
            "Q1000",
            HttpStatus.BAD_REQUEST,
            "Malformed JSON",
            "요청 본문의 JSON 형식이 올바르지 않습니다.",
            "/problems/malformed-json");

    private final String code;
    private final HttpStatus httpStatus;
    private final String title;
    private final String detail;
    private final String type;
}
