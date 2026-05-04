package com.lucas.hint.dto.response;

import java.util.Map;
import lombok.Builder;
import lombok.Getter;

/** 최종 선택된 힌트 근거(evidence) 응답 DTO입니다. */
@Getter
@Builder
public class HintEvidenceResponseDto {

  private Long knowledgeId;
  private Long transitionId;
  private String toNodeCode;
  private String actionType;
  private double similarity;
  private double cosineDistance;
  private int priorityRank;
  private int priority;
  private int candidateCount;
  private String content;
  private Map<String, Object> metadata;
}
