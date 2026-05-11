package com.lucas.hint.dto.response;

import java.util.List;
import java.util.Map;
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
  private String messageType;
  private String routeDecision;
  private String intentSubtype;
  private String actionType;
  private int failCountAfterAction;
  private int repeatCountAfterAction;
  private int stressScore;
  private String hintLevel;
  private String repeatDecision;
  private int queryVectorDimension;
  private String queryText;
  private String selectedPhase;
  private boolean lowConfidence;
  private int searchTopK;
  private int evidenceLimit;
  private double minSimilarity;
  private int candidateCount;
  private Map<String, Object> commandUsageContext;
  private List<HintEvidenceResponseDto> evidences;
}
