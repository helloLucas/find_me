package com.lucas.ending.dto.response;

import java.util.List;
import lombok.Builder;
import lombok.Getter;

/**
 * 엔딩 결과 화면에 표시할 연출 문구 응답 DTO입니다.
 *
 * <p>엔딩명, 설명, 터미널 로그 문구를 프론트엔드 번들에 넣지 않기 위해 백엔드에서 조건부로 내려줍니다.
 */
@Getter
@Builder
public class EndingResultSceneResponse {

  /** 결과 화면 종류입니다. 현재 엔딩 결과 화면은 개별 엔딩만 사용하므로 ENDING 값을 내려줍니다. */
  private String variant;

  /** 프론트엔드가 색상 톤만 선택할 수 있도록 전달하는 비서사 값입니다. */
  private String tone;

  /** 결과 화면 상단 왼쪽 보조 라벨입니다. */
  private String headerLeft;

  /** 결과 화면 상단 오른쪽 보조 라벨입니다. */
  private String headerRight;

  /** 엔딩 분류 또는 완료 상태를 나타내는 짧은 라벨입니다. */
  private String classification;

  /** 결과 화면의 핵심 제목입니다. */
  private String title;

  /** 엔딩 결과의 의미를 설명하는 본문 문구입니다. */
  private String headline;

  /** 터미널 패널에 표시할 로그 라인 목록입니다. */
  private List<String> terminalLines;

  /** 결과 화면의 주 동작 버튼 라벨입니다. */
  private String primaryActionLabel;
}
