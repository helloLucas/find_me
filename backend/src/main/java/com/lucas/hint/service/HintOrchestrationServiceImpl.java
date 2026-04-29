package com.lucas.hint.service;

import com.lucas.hint.dto.request.HintLiveRetrieveRequestDto;
import com.lucas.hint.dto.response.HintEsSignalResponseDto;
import com.lucas.hint.dto.response.HintEvidenceResponseDto;
import com.lucas.hint.dto.response.HintLiveResponseDto;
import com.lucas.hint.dto.response.HintLiveRetrieveResponseDto;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Retrieval 결과를 기반으로 외부 LLM 호출부에 힌트 생성을 위임합니다. */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class HintOrchestrationServiceImpl implements HintOrchestrationService {

  private final HintRetrievalService hintRetrievalService;
  private final HintEsSignalService hintEsSignalService;
  private final HintLlmOrchestratorClient hintLlmOrchestratorClient;

  @Override
  public HintLiveResponseDto generateLiveHint(Long userId, HintLiveRetrieveRequestDto request) {
    HintLiveRetrieveResponseDto retrieval = hintRetrievalService.retrieveLive(userId, request);
    Optional<HintEsSignalResponseDto> esSignal =
        hintEsSignalService.loadSignals(
            retrieval.getChapterCode(), retrieval.getFromNodeCode(), retrieval.getActionType());

    HintEvidenceResponseDto topEvidence = firstEvidence(retrieval.getEvidences());
    String fallbackHintLevel =
        resolveHintLevel(retrieval.getFailCountAfterAction(), retrieval.isLowConfidence());

    try {
      HintLlmOrchestratorClient.HintGenerationResult llmResult =
          hintLlmOrchestratorClient.generate(
              HintLlmOrchestratorClient.HintGenerationRequest.builder()
                  .sessionId(retrieval.getSessionId())
                  .userId(retrieval.getUserId())
                  .chapterCode(retrieval.getChapterCode())
                  .fromNodeCode(retrieval.getFromNodeCode())
                  .actionType(retrieval.getActionType())
                  .failCountAfterAction(retrieval.getFailCountAfterAction())
                  .selectedPhase(retrieval.getSelectedPhase())
                  .lowConfidence(retrieval.isLowConfidence())
                  .queryText(retrieval.getQueryText())
                  .evidences(retrieval.getEvidences())
                  .esSignal(esSignal.orElse(null))
                  .build());

      return HintLiveResponseDto.builder()
          .hint(llmResult.hintText())
          .hintLevel(llmResult.hintLevel())
          .selectedPhase(retrieval.getSelectedPhase())
          .lowConfidence(retrieval.isLowConfidence())
          .failCountAfterAction(retrieval.getFailCountAfterAction())
          .whyThisHint(llmResult.whyThisHint())
          .nextActionType(llmResult.nextActionType())
          .nextInputPattern(llmResult.nextInputPattern())
          .usedTransitionIds(llmResult.usedTransitionIds())
          .topEvidence(topEvidence)
          .esSignal(esSignal.orElse(null))
          .retrieval(retrieval)
          .build();
    } catch (Exception e) {
      log.warn("LLM orchestrator unavailable. fallback hint used. reason={}", e.getMessage());
      String fallbackHint = composeFallbackHint(fallbackHintLevel, retrieval, topEvidence);

      return HintLiveResponseDto.builder()
          .hint(fallbackHint)
          .hintLevel(fallbackHintLevel)
          .selectedPhase(retrieval.getSelectedPhase())
          .lowConfidence(retrieval.isLowConfidence())
          .failCountAfterAction(retrieval.getFailCountAfterAction())
          .whyThisHint("llm_orchestrator_unavailable_fallback")
          .nextActionType(topEvidence != null ? topEvidence.getActionType() : null)
          .nextInputPattern(extractExpectedInput(topEvidence))
          .usedTransitionIds(extractUsedTransitionIds(topEvidence))
          .topEvidence(topEvidence)
          .esSignal(esSignal.orElse(null))
          .retrieval(retrieval)
          .build();
    }
  }

  private HintEvidenceResponseDto firstEvidence(List<HintEvidenceResponseDto> evidences) {
    if (evidences == null || evidences.isEmpty()) {
      return null;
    }
    return evidences.get(0);
  }

  private String resolveHintLevel(int failCountAfterAction, boolean lowConfidence) {
    if (lowConfidence) {
      return "LOW_CONFIDENCE";
    }
    if (failCountAfterAction >= 6) {
      return "STRONG";
    }
    if (failCountAfterAction >= 3) {
      return "MEDIUM";
    }
    return "LIGHT";
  }

  private String composeFallbackHint(
      String hintLevel, HintLiveRetrieveResponseDto retrieval, HintEvidenceResponseDto topEvidence) {
    if (topEvidence == null) {
      return "지금 노드에서 가능한 행동을 하나씩 다시 확인해보세요. 현재 입력과 대상이 맞는지 점검하면 다음 단서를 찾을 수 있습니다.";
    }

    String actionType = safeText(topEvidence.getActionType());
    String expectedInput = extractExpectedInput(topEvidence);

    if ("LOW_CONFIDENCE".equals(hintLevel)) {
      return "현재 근거 신뢰도가 낮습니다. 직전 행동을 복기하고 " + actionType + " 계열 행동을 중심으로 탐색을 이어가세요.";
    }
    if ("LIGHT".equals(hintLevel)) {
      return "지금 노드의 핵심 행동 타입은 " + actionType + " 입니다. 입력/대상 선택을 다시 점검해보세요.";
    }
    if ("MEDIUM".equals(hintLevel)) {
      if (isBlank(expectedInput)) {
        return "지금 노드는 " + actionType + " 동작이 정답 경로입니다. 입력 형식을 한 단계 더 정확히 맞춰보세요.";
      }
      return "지금 노드의 정답 행동은 "
          + actionType
          + " 입니다. 입력 형식을 아래 단서에 맞춰보세요: "
          + expectedInput;
    }
    if (!isBlank(expectedInput)) {
      return "정답 행동은 " + actionType + " 이고, 시도할 값은 `" + expectedInput + "` 입니다.";
    }
    return "정답 행동은 " + actionType + " 입니다. 현재 노드(" + retrieval.getFromNodeCode() + ")의 조건을 다시 점검하세요.";
  }

  private String extractExpectedInput(HintEvidenceResponseDto evidence) {
    if (evidence == null || evidence.getMetadata() == null) {
      return null;
    }
    Map<String, Object> metadata = evidence.getMetadata();
    Object value = metadata.get("expected_input");
    return value == null ? null : String.valueOf(value);
  }

  private String safeText(String value) {
    return isBlank(value) ? "action" : value;
  }

  private List<Long> extractUsedTransitionIds(HintEvidenceResponseDto topEvidence) {
    if (topEvidence == null || topEvidence.getTransitionId() == null) {
      return List.of();
    }
    return List.of(topEvidence.getTransitionId());
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
