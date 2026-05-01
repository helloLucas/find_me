package com.lucas.story.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;
import lombok.Builder;
import lombok.Getter;

/** 스토리 노드 간의 상태 전이(Transition) 결과를 담아 프론트엔드로 전달하는 응답 객체입니다. */
@Getter
@Builder
public class TransitionResponseDto {

  /** 전이 후 이동하게 될 다음 노드에 대한 정보 */
  private NextNodeDto nextNode;

  /** 전이 후 갱신된 게임 세션의 전체 스냅샷 데이터 */
  private Map<String, Object> snapshot;

  /** 전이 시 발생하는 특수 효과(화면 효과, 사운드 등) 목록 */
  private List<EffectDto> effects;

  /** 전이 결과 타입 (예: "move", "stay", "end") */
  private String result;

  /** 터미널 명령어 실행 결과 (Chapter 2 자유 이동 시 사용) */
  private TerminalResultDto terminalResult;

  /** 다음 노드의 상세 정보를 정의하는 내부 정적 클래스입니다. */
  @Getter
  @Builder
  public static class NextNodeDto {
    /** 노드 식별 ID */
    private Long id;

    /** 노드 고유 코드 */
    private String code;

    /** 노드의 타입 (dialogue, terminal 등) */
    private String nodeType;

    /** 노드 진입 시 출력될 번들 데이터 */
    private JsonNode outputBundle;

    /** 유저 입력 방식 (command, select 등) */
    private String promptType;

    /** 입력 방식에 따른 부가 설정 데이터 */
    private JsonNode promptMeta;

    /** 해당 노드가 체크포인트인지 여부 */
    private boolean isCheckpoint;

    /** 해당 노드가 터미널 모드인지 여부 */
    private boolean isTerminal;
  }

  /** 전이 시 발생하는 효과 정보를 정의하는 내부 정적 클래스입니다. */
  @Getter
  @Builder
  public static class EffectDto {
    /** 효과 타입 (예: "glitch", "sound") */
    private String type;

    /** 효과 실행에 필요한 상세 데이터 */
    private Object payload;
  }

  /** 터미널 명령어 실행 결과를 상세히 정의하는 내부 정적 클래스입니다. */
  @Getter
  @Builder
  public static class TerminalResultDto {
    /** 터미널 표준 출력 내용 */
    private List<String> stdout;

    /** 터미널 표준 에러 내용 */
    private List<String> stderr;

    /** 현재 작업 디렉토리 경로 */
    private String cwd;

    /** 다음에 표시될 프롬프트 문자열 */
    private String prompt;

    /** 실행 결과 코드 (SUCCESS/ERROR) */
    private String resultCode;
  }
}
