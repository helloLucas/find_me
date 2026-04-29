package com.lucas.story.service.terminal;

import java.util.List;
import lombok.Builder;

/** 터미널 명령어를 실행한 후 프론트엔드로 전달할 최종 결과를 담는 데이터 전송 객체(DTO)입니다. 빌더 패턴을 사용하여 유연하게 결과를 생성할 수 있습니다. */
@Builder
public record TerminalResult(
    /** 명령어가 성공적으로 실행되었을 때 표준 출력으로 나갈 텍스트 라인 리스트 */
    List<String> stdout,
    /** 명령어 실행 중 에러가 발생했을 때 표준 에러로 나갈 텍스트 라인 리스트 */
    List<String> stderr,
    /** 명령어 실행 후 변경되거나 유지된 현재 작업 디렉토리(CWD) 경로 */
    String cwd,
    /** 터미널 화면에 표시될 다음 프롬프트 문자열 */
    String prompt,
    /** 실행 성공 여부를 나타내는 상태 코드 (예: "SUCCESS", "ERROR") */
    String resultCode) {
  // 빌더 패턴 지원을 위해 Lombok @Builder 어노테이션을 사용합니다.
}
