package com.lucas.hint.model;

/**
 * 벡터 검색 단계(phase) 구분값입니다.
 *
 * <p>검색 범위를 점진적으로 완화하며, 성공한 가장 좁은 phase 결과만 최종 근거로 사용합니다.
 */
public enum HintSearchPhase {
  STRICT("strict"),
  FALLBACK_ACTION_REMOVED("fallback_action_removed"),
  FALLBACK_CHAPTER_ONLY("fallback_chapter_only"),
  NONE("none");

  private final String value;

  HintSearchPhase(String value) {
    this.value = value;
  }

  public String value() {
    return value;
  }
}

