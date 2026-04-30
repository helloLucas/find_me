package com.lucas.hint.dto.response;

import java.util.List;
import lombok.Builder;
import lombok.Getter;

/** 실시간 힌트 호출 결과를 반환하는 DTO입니다. */
@Getter
@Builder
public class HintLiveResponseDto {

  private String hint;
  private String hintLevel;
  private String messageType;
  private String routeDecision;
  private String selectedPhase;
  private boolean lowConfidence;
  private int failCountAfterAction;
  private String whyThisHint;
  private String nextActionType;
  private String nextInputPattern;
  private List<Long> usedTransitionIds;
  private HintEvidenceResponseDto topEvidence;
  private HintEsSignalResponseDto esSignal;
  private HintLiveRetrieveResponseDto retrieval;
}
