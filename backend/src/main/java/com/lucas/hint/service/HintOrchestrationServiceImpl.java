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
          "지금은 이러고 있을 시간이 없어. 먼저 눈앞의 일부터 정리하자.",
          "그 얘기는 잠시 보류하자. 지금 문제 해결에 집중해줘. 상황이 나아지면 그때 다시 이야기 하자.",
          "우리 채널이 간섭받고 있어. 이 상황부터 빨리 극복해야해. 단서 먼저 확인해보자.",
          "지금은 다른 이야기를 할 때가 아니야. 시간이 없으니 필요한 단서부터 찾고 나중에 이야기하자.");

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

      return HintLiveResponseDto.builder()
          .hint(safeHint)
          .hintLevel(llmResult.hintLevel())
          .messageType(messageType)
          .routeDecision(routeDecision)
          .selectedPhase(retrieval.getSelectedPhase())
          .lowConfidence(retrieval.isLowConfidence())
          .failCountAfterAction(retrieval.getFailCountAfterAction())
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
        .topEvidence(null)
        .esSignal(null)
        .retrieval(retrieval)
        .build();
  }

  private String composeFallbackHint(
      String hintLevel,
      HintLiveRetrieveResponseDto retrieval,
      HintEvidenceResponseDto topEvidence) {
    List<String> fallbackMessages =
        List.of(
            "지금 신호가 불안정해서 너의 채팅을 못봤어. 잠시 후 다시 말을 걸어줘.",
            "연결 상태가 불안정해. 잠깐 뒤에 다시 말해줘.",
            "시스템 간섭으로 우리의 연결 상태가 좋지 못해. 잠시 후 다시 말을 걸어줘.");
    return fallbackMessages.get(ThreadLocalRandom.current().nextInt(fallbackMessages.size()));
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
    if (isBlank(rawHintText)) {
      return rawHintText;
    }
    String sanitized = rawHintText;
    if (!isBlank(expectedInput)) {
      String masked = obfuscateExpectedInput(expectedInput);
      if (!isBlank(masked)) {
        sanitized = sanitized.replace(expectedInput, masked);
      }
    }
    return sanitizeInternalActionTokensInText(sanitized);
  }

  private String obfuscateExpectedInput(String expectedInput) {
    if (isBlank(expectedInput)) {
      return null;
    }
    String normalized = expectedInput.trim();
    if (normalized.startsWith("open_")
        || normalized.startsWith("go_to_")
        || normalized.startsWith("reopen_")) {
      return "관련 버튼";
    }
    if ("dismiss".equalsIgnoreCase(normalized)) {
      return "닫기 버튼";
    }
    if ("auto".equalsIgnoreCase(normalized)) {
      return "자동 트리거";
    }
    if (looksLikeInternalActionToken(normalized)) {
      return "해당 UI 요소";
    }
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

  private String sanitizeInternalActionTokensInText(String text) {
    if (isBlank(text)) {
      return text;
    }
    String sanitized = text;
    sanitized = sanitized.replaceAll("(?i)\\b(?:open|go_to|reopen)_[a-z0-9_]+\\b", "관련 버튼");
    sanitized = sanitized.replaceAll("(?i)\\bdismiss\\b", "닫기 버튼");
    sanitized = sanitized.replaceAll("(?i)\\bauto\\b", "자동 트리거");
    return sanitized;
  }

  private boolean looksLikeInternalActionToken(String text) {
    return text.matches("(?i)[a-z][a-z0-9]*(?:_[a-z0-9]+)+");
  }

  private String safeText(String value) {
    return isBlank(value) ? "action" : value;
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
