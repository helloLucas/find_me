package com.lucas.story.service.terminal;

import java.util.List;

/** 유저가 터미널에 입력한 명령줄 문자열을 명령어와 인자로 분리하여 저장하는 데이터 불변 객체(Record)입니다. */
public record ParsedCommand(
    /** 실행하려는 기본 명령어 이름 (예: "ls", "cd") */
    String command,
    /** 명령어 뒤에 따라오는 옵션 및 대상 경로 등의 인자 리스트 */
    List<String> args,
    /** 유저가 입력한 가공되지 않은 전체 문자열 */
    String rawInput) {
  // 레코드 형식이므로 별도의 getter 구현 없이 필드명으로 접근 가능합니다.
}
