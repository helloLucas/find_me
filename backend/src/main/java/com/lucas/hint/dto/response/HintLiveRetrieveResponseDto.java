package com.lucas.hint.dto.response;

import java.util.List;
import lombok.Builder;
import lombok.Getter;

/** 실시간 세션 기반 벡터 검색 결과 요약 응답 DTO입니다. */
@Getter
@Builder
public class HintLiveRetrieveResponseDto {

  private String sessionId;
  private Long userId;
  private String chapterCode;
  private String fromNodeCode;
  private String actionType;
  private int failCountAfterAction;
  private int queryVectorDimension;
  private String queryText;
  private String selectedPhase;
  private boolean lowConfidence;
  private int searchTopK;
  private int evidenceLimit;
  private double minSimilarity;
  private int candidateCount;
  private List<HintEvidenceResponseDto> evidences;
}

