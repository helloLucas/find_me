package com.lucas.hint.service;

import com.lucas.hint.dto.request.HintLiveRetrieveRequestDto;
import com.lucas.hint.dto.response.HintEsSignalResponseDto;
import com.lucas.hint.dto.response.HintEvidenceResponseDto;
import com.lucas.hint.dto.response.HintLiveResponseDto;
import com.lucas.hint.dto.response.HintLiveRetrieveResponseDto;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class HintOrchestrationServiceImpl implements HintOrchestrationService {

  private static final String ROUTE_RAG_HINT = "RAG_HINT";
  private static final String ROUTE_BLOCKED_NON_HINT = "BLOCKED_NON_HINT";

  private static final List<String> BLOCKED_NON_HINT_MESSAGES =
      List.of(
          "지금은 그 신호를 볼 시간이 없어. 먼저 눈앞 단서부터 정리하자.",
          "그 얘기는 잠시 보류하자. 지금 단계 해결에 집중해줘.",
          "채널이 간섭되고 있어. 현재 화면의 행동 단서를 다시 확인해보자.",
          "지금은 우회할 때가 아니야. 당장 진행에 필요한 단서부터 잡자.");

  private final HintRetrievalService hintRetrievalService;
  private final HintEsSignalService hintEsSignalService;
  private final HintLlmOrchestratorClient hintLlmOrchestratorClient;

  @Override
  public HintLiveResponseDto generateLiveHint(Long userId, HintLiveRetrieveRequestDto request) {
    HintLiveRetrieveResponseDto retrieval = hintRetrievalService.retrieveLive(userId, request);
    String messageType = fallbackText(retrieval.getMessageType(), "none");
    String routeDecision = fallbackText(retrieval.getRouteDecision(), ROUTE_RAG_HINT);
    HintEvidenceResponseDto rawTopEvidence = firstEvidence(retrieval.getEvidences());
    HintEvidenceResponseDto topEvidence = sanitizeEvidence(rawTopEvidence);
    HintLiveRetrieveResponseDto sanitizedRetrieval = sanitizeRetrieval(retrieval);
    String fallbackHintLevel =
        resolveHintLevel(retrieval.getFailCountAfterAction(), retrieval.isLowConfidence());

    if (ROUTE_BLOCKED_NON_HINT.equals(routeDecision)) {
      return buildBlockedResponse(retrieval, messageType, routeDecision);
    }

    Optional<HintEsSignalResponseDto> esSignal =
        hintEsSignalService.loadSignals(
            retrieval.getChapterCode(), retrieval.getFromNodeCode(), retrieval.getActionType());

    try {
      HintLlmOrchestratorClient.HintGenerationResult llmResult =
          hintLlmOrchestratorClient.generate(
              HintLlmOrchestratorClient.HintGenerationRequest.builder()
                  .sessionId(retrieval.getSessionId())
                  .userId(retrieval.getUserId())
                  .chapterCode(retrieval.getChapterCode())
                  .fromNodeCode(retrieval.getFromNodeCode())
                  .actionType(retrieval.getActionType())
                  .userMessage(request.getUserMessage())
                  .failCountAfterAction(retrieval.getFailCountAfterAction())
                  .selectedPhase(retrieval.getSelectedPhase())
                  .lowConfidence(retrieval.isLowConfidence())
                  .queryText(retrieval.getQueryText())
                  .evidences(retrieval.getEvidences())
                  .esSignal(esSignal.orElse(null))
                  .build());

      String expectedInput = extractExpectedInput(rawTopEvidence);
      String safeHint = sanitizeHintText(llmResult.hintText(), expectedInput);
      String safeInputPattern =
          obfuscateExpectedInput(
              !isBlank(llmResult.nextInputPattern()) ? llmResult.nextInputPattern() : expectedInput);

      return HintLiveResponseDto.builder()
          .hint(safeHint)
          .hintLevel(llmResult.hintLevel())
          .messageType(messageType)
          .routeDecision(routeDecision)
          .selectedPhase(retrieval.getSelectedPhase())
          .lowConfidence(retrieval.isLowConfidence())
          .failCountAfterAction(retrieval.getFailCountAfterAction())
          .whyThisHint(llmResult.whyThisHint())
          .nextActionType(llmResult.nextActionType())
          .nextInputPattern(safeInputPattern)
          .usedTransitionIds(llmResult.usedTransitionIds())
          .topEvidence(topEvidence)
          .esSignal(esSignal.orElse(null))
          .retrieval(sanitizedRetrieval)
          .build();
    } catch (Exception e) {
      log.warn("LLM orchestrator unavailable. fallback hint used. reason={}", e.getMessage());
      String fallbackHint = composeFallbackHint(fallbackHintLevel, retrieval, rawTopEvidence);

      return HintLiveResponseDto.builder()
          .hint(fallbackHint)
          .hintLevel(fallbackHintLevel)
          .messageType(messageType)
          .routeDecision(routeDecision)
          .selectedPhase(retrieval.getSelectedPhase())
          .lowConfidence(retrieval.isLowConfidence())
          .failCountAfterAction(retrieval.getFailCountAfterAction())
          .whyThisHint("llm_orchestrator_unavailable_fallback")
          .nextActionType(topEvidence != null ? topEvidence.getActionType() : null)
          .nextInputPattern(obfuscateExpectedInput(extractExpectedInput(rawTopEvidence)))
          .usedTransitionIds(extractUsedTransitionIds(rawTopEvidence))
          .topEvidence(topEvidence)
          .esSignal(esSignal.orElse(null))
          .retrieval(sanitizedRetrieval)
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

  private HintLiveResponseDto buildBlockedResponse(
      HintLiveRetrieveResponseDto retrieval, String messageType, String routeDecision) {
    String blockedMessage =
        BLOCKED_NON_HINT_MESSAGES.get(
            ThreadLocalRandom.current().nextInt(BLOCKED_NON_HINT_MESSAGES.size()));
    return HintLiveResponseDto.builder()
        .hint(blockedMessage)
        .hintLevel("LOW_CONFIDENCE")
        .messageType(messageType)
        .routeDecision(routeDecision)
        .selectedPhase(retrieval.getSelectedPhase())
        .lowConfidence(true)
        .failCountAfterAction(retrieval.getFailCountAfterAction())
        .whyThisHint("non_hint_blocked")
        .nextActionType(null)
        .nextInputPattern(null)
        .usedTransitionIds(List.of())
        .topEvidence(null)
        .esSignal(null)
        .retrieval(retrieval)
        .build();
  }

  private String composeFallbackHint(
      String hintLevel, HintLiveRetrieveResponseDto retrieval, HintEvidenceResponseDto topEvidence) {
    if (topEvidence == null) {
      return "지금 노드에서 가능한 행동 타입을 다시 확인해봐. 바로 직전 행동과 연결되는 단서를 먼저 점검하자.";
    }

    String actionType = safeText(topEvidence.getActionType());
    String expectedInput = extractExpectedInput(topEvidence);
    String maskedInput = obfuscateExpectedInput(expectedInput);

    if ("LOW_CONFIDENCE".equals(hintLevel)) {
      return "지금은 근거가 약해. 직전 행동을 기준으로 " + actionType + " 계열 동작을 다시 맞춰보자.";
    }
    if ("LIGHT".equals(hintLevel)) {
      return "지금 노드의 핵심 행동 타입은 " + actionType + "이야. 입력이나 대상 선택을 다시 점검해봐.";
    }
    if ("MEDIUM".equals(hintLevel)) {
      if (isBlank(maskedInput)) {
        return "지금 노드에서는 " + actionType + " 동작이 맞아. 형식과 대상이 맞는지 한 번 더 확인해줘.";
      }
      return "지금 노드의 정답 행동은 " + actionType + "이야. 입력은 `" + maskedInput + "` 형태로 맞춰봐.";
    }
    if (!isBlank(maskedInput)) {
      return "정답 행동은 " + actionType + "이야. 값 전체를 그대로 말해줄 순 없고, `"
          + maskedInput
          + "` 형태를 기준으로 시도해봐.";
    }
    return "정답 행동은 " + actionType + "이야. 현재 노드(" + retrieval.getFromNodeCode() + ") 조건을 다시 맞춰봐.";
  }

  private String extractExpectedInput(HintEvidenceResponseDto evidence) {
    if (evidence == null || evidence.getMetadata() == null) {
      return null;
    }
    Map<String, Object> metadata = evidence.getMetadata();
    Object value = metadata.get("expected_input");
    return value == null ? null : String.valueOf(value);
  }

  private String sanitizeHintText(String rawHintText, String expectedInput) {
    if (isBlank(rawHintText) || isBlank(expectedInput)) {
      return rawHintText;
    }
    String masked = obfuscateExpectedInput(expectedInput);
    if (isBlank(masked)) {
      return rawHintText;
    }
    return rawHintText.replace(expectedInput, masked);
  }

  private String obfuscateExpectedInput(String expectedInput) {
    if (isBlank(expectedInput)) {
      return null;
    }
    String normalized = expectedInput.trim();
    int atIndex = normalized.indexOf('@');
    if (atIndex > 0) {
      return normalized.substring(0, atIndex + 1) + "서버ip";
    }
    String[] tokens = normalized.split("\\s+");
    if (tokens.length >= 2) {
      StringBuilder sb = new StringBuilder();
      for (int i = 0; i < tokens.length; i++) {
        if (i == tokens.length - 1) {
          sb.append("<값>");
        } else {
          sb.append(tokens[i]).append(' ');
        }
      }
      return sb.toString().trim();
    }
    if (normalized.length() <= 3) {
      return normalized.charAt(0) + "...";
    }
    return normalized.substring(0, normalized.length() - 2) + "..";
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

  private String fallbackText(String value, String fallback) {
    return isBlank(value) ? fallback : value;
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private HintLiveRetrieveResponseDto sanitizeRetrieval(HintLiveRetrieveResponseDto retrieval) {
    return HintLiveRetrieveResponseDto.builder()
        .sessionId(retrieval.getSessionId())
        .userId(retrieval.getUserId())
        .chapterCode(retrieval.getChapterCode())
        .fromNodeCode(retrieval.getFromNodeCode())
        .messageType(retrieval.getMessageType())
        .routeDecision(retrieval.getRouteDecision())
        .actionType(retrieval.getActionType())
        .failCountAfterAction(retrieval.getFailCountAfterAction())
        .queryVectorDimension(retrieval.getQueryVectorDimension())
        .queryText(retrieval.getQueryText())
        .selectedPhase(retrieval.getSelectedPhase())
        .lowConfidence(retrieval.isLowConfidence())
        .searchTopK(retrieval.getSearchTopK())
        .evidenceLimit(retrieval.getEvidenceLimit())
        .minSimilarity(retrieval.getMinSimilarity())
        .candidateCount(retrieval.getCandidateCount())
        .evidences(sanitizeEvidences(retrieval.getEvidences()))
        .build();
  }

  private List<HintEvidenceResponseDto> sanitizeEvidences(List<HintEvidenceResponseDto> evidences) {
    if (evidences == null || evidences.isEmpty()) {
      return List.of();
    }
    List<HintEvidenceResponseDto> result = new ArrayList<>();
    for (HintEvidenceResponseDto evidence : evidences) {
      result.add(sanitizeEvidence(evidence));
    }
    return result;
  }

  private HintEvidenceResponseDto sanitizeEvidence(HintEvidenceResponseDto evidence) {
    if (evidence == null) {
      return null;
    }
    String rawExpectedInput = extractExpectedInput(evidence);
    String maskedExpectedInput = obfuscateExpectedInput(rawExpectedInput);

    Map<String, Object> sanitizedMetadata = new LinkedHashMap<>();
    if (evidence.getMetadata() != null) {
      sanitizedMetadata.putAll(evidence.getMetadata());
      if (!isBlank(maskedExpectedInput) && evidence.getMetadata().containsKey("expected_input")) {
        sanitizedMetadata.put("expected_input", maskedExpectedInput);
      }
    }

    String sanitizedContent = evidence.getContent();
    if (!isBlank(sanitizedContent) && !isBlank(rawExpectedInput) && !isBlank(maskedExpectedInput)) {
      sanitizedContent = sanitizedContent.replace(rawExpectedInput, maskedExpectedInput);
    }

    return HintEvidenceResponseDto.builder()
        .knowledgeId(evidence.getKnowledgeId())
        .transitionId(evidence.getTransitionId())
        .toNodeCode(evidence.getToNodeCode())
        .actionType(evidence.getActionType())
        .similarity(evidence.getSimilarity())
        .cosineDistance(evidence.getCosineDistance())
        .priorityRank(evidence.getPriorityRank())
        .priority(evidence.getPriority())
        .candidateCount(evidence.getCandidateCount())
        .content(sanitizedContent)
        .metadata(sanitizedMetadata)
        .build();
  }
}
