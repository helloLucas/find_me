package com.lucas.hint.model;

import java.util.Map;
import lombok.Builder;
import lombok.Getter;

/**
 * lucas_knowledge 벡터 검색 단건 결과입니다.
 *
 * <p>코사인 거리/유사도와 transition 메타데이터를 함께 보관해 후처리(phase 선택, evidence 정렬)에 사용합니다.
 */
@Getter
@Builder
public class HintVectorCandidate {

  private Long id;
  private Integer chapter;
  private String puzzleId;
  private String content;
  private Map<String, Object> metadata;
  private double cosineDistance;
  private double similarity;
  private int priority;
  private int priorityRank;
  private int candidateCount;
}
