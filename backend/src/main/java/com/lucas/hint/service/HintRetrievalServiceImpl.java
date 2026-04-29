package com.lucas.hint.service;

import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.hint.dto.request.HintLiveRetrieveRequestDto;
import com.lucas.hint.dto.response.HintEvidenceResponseDto;
import com.lucas.hint.dto.response.HintLiveRetrieveResponseDto;
import com.lucas.hint.model.HintSearchPhase;
import com.lucas.hint.model.HintVectorCandidate;
import com.lucas.hint.repository.LucasKnowledgeVectorSearchRepository;
import com.lucas.progress.entity.UserStoryProgress;
import com.lucas.progress.repository.UserStoryProgressRepository;
import com.lucas.story.entity.StoryTransition;
import com.lucas.story.repository.StoryTransitionRepository;
import com.lucas.story.service.redis.StoryRecentEvent;
import com.lucas.story.service.redis.StorySessionRedisService;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 온디맨드 힌트 벡터 검색 오케스트레이션 구현체입니다.
 *
 * <p>실서비스와 동일한 런타임 문맥(Progress + Redis 이벤트)을 이용해 query embedding을 만들고 strict/fallback
 * phase 규칙대로 evidence를 선택합니다.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class HintRetrievalServiceImpl implements HintRetrievalService {

  private static final int DEFAULT_RECENT_ACTION_LIMIT = 5;
  private static final int REQUIRED_VECTOR_DIMENSION = 1536;

  private final UserStoryProgressRepository userStoryProgressRepository;
  private final StoryTransitionRepository storyTransitionRepository;
  private final StorySessionRedisService storySessionRedisService;
  private final HintEmbeddingClient hintEmbeddingClient;
  private final LucasKnowledgeVectorSearchRepository vectorSearchRepository;

  @Value("${app.hint.search-top-k:10}")
  private int defaultSearchTopK;

  @Value("${app.hint.evidence-limit:3}")
  private int defaultEvidenceLimit;

  @Value("${app.hint.min-similarity:0.70}")
  private double defaultMinSimilarity;

  @Value("${app.hint.recent-action-limit:5}")
  private int recentActionLimit;

  @Override
  public HintLiveRetrieveResponseDto retrieveLive(Long userId, HintLiveRetrieveRequestDto request) {
    UserStoryProgress progress =
        userStoryProgressRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.E3003));

    String sessionId = resolveSessionId(userId, request.getSessionId());
    String chapterCode = progress.getLatestChapter().getCode();
    String fromNodeCode = progress.getLatestNode().getCode();

    int searchTopK = resolveSearchTopK(request.getSearchTopK());
    int evidenceLimit = resolveEvidenceLimit(request.getEvidenceLimit(), searchTopK);
    double minSimilarity = resolveMinSimilarity(request.getMinSimilarity());

    List<StoryRecentEvent> recentEvents = storySessionRedisService.getRecentEvents(sessionId, resolveRecentLimit());
    int failCount = storySessionRedisService.getFailCount(sessionId);

    StoryRecentEvent latestEvent = recentEvents.isEmpty() ? null : recentEvents.get(0);
    String actionType = latestEvent != null ? latestEvent.actionType() : null;
    String currentInput = latestEvent != null ? latestEvent.inputValueNorm() : null;

    TransitionExpectation expectation = resolveTransitionExpectation(progress.getLatestNode().getId());

    HintEmbeddingClient.QueryEmbeddingRequest embeddingRequest =
        new HintEmbeddingClient.QueryEmbeddingRequest(
            chapterCode,
            fromNodeCode,
            actionType,
            currentInput,
            failCount,
            expectation.expectedActionType(),
            expectation.expectedInputHint(),
            mapRecentActions(recentEvents),
            buildExtraContext(sessionId, fromNodeCode),
            REQUIRED_VECTOR_DIMENSION);

    HintEmbeddingClient.QueryEmbeddingResult embeddingResult = hintEmbeddingClient.embedQuery(embeddingRequest);
    validateVector(embeddingResult.vector());
    String queryVector = vectorToLiteral(embeddingResult.vector());

    PhaseSearchResult phaseResult =
        runPhaseSearch(queryVector, chapterCode, fromNodeCode, actionType, searchTopK, minSimilarity);

    List<HintVectorCandidate> selectedEvidence =
        selectEvidenceWithinPhase(phaseResult.candidates(), evidenceLimit, minSimilarity);

    boolean lowConfidence =
        phaseResult.phase() == HintSearchPhase.FALLBACK_CHAPTER_ONLY
            || selectedEvidence.stream().noneMatch(c -> c.getSimilarity() >= minSimilarity);

    return HintLiveRetrieveResponseDto.builder()
        .sessionId(sessionId)
        .userId(userId)
        .chapterCode(chapterCode)
        .fromNodeCode(fromNodeCode)
        .actionType(actionType)
        .failCountAfterAction(failCount)
        .queryVectorDimension(embeddingResult.vector().size())
        .queryText(embeddingResult.text())
        .selectedPhase(phaseResult.phase().value())
        .lowConfidence(lowConfidence)
        .searchTopK(searchTopK)
        .evidenceLimit(evidenceLimit)
        .minSimilarity(minSimilarity)
        .candidateCount(phaseResult.candidates().size())
        .evidences(toEvidenceDtos(selectedEvidence))
        .build();
  }

  private TransitionExpectation resolveTransitionExpectation(Long fromNodeId) {
    List<StoryTransition> transitions =
        storyTransitionRepository.findByFromNode_IdOrderByPriorityDesc(fromNodeId);

    for (StoryTransition transition : transitions) {
      if (transition.getToNode() != null
          && transition.getToNode().getCode() != null
          && transition.getToNode().getCode().contains("_FAIL_")) {
        continue;
      }
      return new TransitionExpectation(transition.getActionType(), transition.getExpectedInput());
    }
    return new TransitionExpectation(null, null);
  }

  private List<Map<String, Object>> mapRecentActions(List<StoryRecentEvent> events) {
    List<Map<String, Object>> mapped = new ArrayList<>();
    for (StoryRecentEvent event : events) {
      Map<String, Object> item = new LinkedHashMap<>();
      item.put("action_type", event.actionType());
      item.put("input_value_norm", event.inputValueNorm());
      item.put("result", event.result());
      item.put("from_node_id", event.fromNodeId());
      mapped.add(item);
    }
    return mapped;
  }

  private List<String> buildExtraContext(String sessionId, String fromNodeCode) {
    List<String> context = new ArrayList<>();
    context.add("retrieval_mode=live_session");
    context.add("session_id=" + sessionId);
    context.add("node_scope=" + fromNodeCode);
    return context;
  }

  private PhaseSearchResult runPhaseSearch(
      String queryVector,
      String chapterCode,
      String fromNodeCode,
      String actionType,
      int searchTopK,
      double minSimilarity) {

    List<HintVectorCandidate> strict =
        vectorSearchRepository.searchStrict(
            queryVector, chapterCode, fromNodeCode, actionType, searchTopK);
    if (hasEnoughSimilarity(strict, minSimilarity)) {
      return new PhaseSearchResult(HintSearchPhase.STRICT, strict);
    }

    List<HintVectorCandidate> actionRemoved =
        vectorSearchRepository.searchFallbackActionRemoved(
            queryVector, chapterCode, fromNodeCode, searchTopK);
    if (hasEnoughSimilarity(actionRemoved, minSimilarity)) {
      return new PhaseSearchResult(HintSearchPhase.FALLBACK_ACTION_REMOVED, actionRemoved);
    }

    List<HintVectorCandidate> chapterOnly =
        vectorSearchRepository.searchFallbackChapterOnly(queryVector, chapterCode, searchTopK);
    if (!chapterOnly.isEmpty()) {
      return new PhaseSearchResult(HintSearchPhase.FALLBACK_CHAPTER_ONLY, chapterOnly);
    }

    return new PhaseSearchResult(HintSearchPhase.NONE, List.of());
  }

  private boolean hasEnoughSimilarity(List<HintVectorCandidate> candidates, double minSimilarity) {
    return candidates.stream().anyMatch(candidate -> candidate.getSimilarity() >= minSimilarity);
  }

  private List<HintVectorCandidate> selectEvidenceWithinPhase(
      List<HintVectorCandidate> candidates, int evidenceLimit, double minSimilarity) {

    if (candidates.isEmpty()) {
      return List.of();
    }

    List<HintVectorCandidate> enoughSimilarity =
        candidates.stream().filter(c -> c.getSimilarity() >= minSimilarity).toList();
    List<HintVectorCandidate> base = enoughSimilarity.isEmpty() ? candidates : enoughSimilarity;

    return base.stream()
        .sorted(
            Comparator.comparingInt(HintVectorCandidate::getPriorityRank)
                .thenComparingDouble(HintVectorCandidate::getCosineDistance)
                .thenComparing(Comparator.comparingInt(HintVectorCandidate::getPriority).reversed())
                .thenComparingLong(HintVectorCandidate::getId))
        .limit(evidenceLimit)
        .toList();
  }

  private List<HintEvidenceResponseDto> toEvidenceDtos(List<HintVectorCandidate> selectedEvidence) {
    List<HintEvidenceResponseDto> result = new ArrayList<>();
    for (HintVectorCandidate candidate : selectedEvidence) {
      Map<String, Object> metadata = candidate.getMetadata();
      Long transitionId = parseLong(metadata.get("transition_id"));
      String toNodeCode = parseText(metadata.get("to_node_code"));
      String actionType = parseText(metadata.get("action_type"));

      result.add(
          HintEvidenceResponseDto.builder()
              .knowledgeId(candidate.getId())
              .transitionId(transitionId)
              .toNodeCode(toNodeCode)
              .actionType(actionType)
              .similarity(candidate.getSimilarity())
              .cosineDistance(candidate.getCosineDistance())
              .priorityRank(candidate.getPriorityRank())
              .priority(candidate.getPriority())
              .candidateCount(candidate.getCandidateCount())
              .content(candidate.getContent())
              .metadata(metadata)
              .build());
    }
    return result;
  }

  private void validateVector(List<Double> vector) {
    if (vector == null || vector.isEmpty()) {
      throw new CustomException(ErrorCode.G1000);
    }
    if (vector.size() != REQUIRED_VECTOR_DIMENSION) {
      log.error(
          "Invalid query vector dimension. expected={}, actual={}",
          REQUIRED_VECTOR_DIMENSION,
          vector.size());
      throw new CustomException(ErrorCode.G1000);
    }
    for (Double value : vector) {
      if (value == null || value.isNaN() || value.isInfinite()) {
        log.error("Invalid query vector value detected.");
        throw new CustomException(ErrorCode.G1000);
      }
    }
  }

  private String vectorToLiteral(List<Double> vector) {
    StringBuilder builder = new StringBuilder();
    builder.append('[');
    for (int i = 0; i < vector.size(); i++) {
      if (i > 0) {
        builder.append(',');
      }
      builder.append(vector.get(i));
    }
    builder.append(']');
    return builder.toString();
  }

  private String resolveSessionId(Long userId, String requestedSessionId) {
    if (requestedSessionId != null && !requestedSessionId.isBlank()) {
      return requestedSessionId;
    }
    return "sess_user_" + userId;
  }

  private int resolveSearchTopK(Integer requested) {
    return requested != null ? requested : defaultSearchTopK;
  }

  private int resolveEvidenceLimit(Integer requested, int searchTopK) {
    int limit = requested != null ? requested : defaultEvidenceLimit;
    return Math.min(limit, searchTopK);
  }

  private double resolveMinSimilarity(Double requested) {
    return requested != null ? requested : defaultMinSimilarity;
  }

  private int resolveRecentLimit() {
    return Math.max(1, recentActionLimit > 0 ? recentActionLimit : DEFAULT_RECENT_ACTION_LIMIT);
  }

  private Long parseLong(Object value) {
    if (value == null) {
      return null;
    }
    if (value instanceof Number number) {
      return number.longValue();
    }
    try {
      return Long.parseLong(String.valueOf(value));
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private String parseText(Object value) {
    return value == null ? null : String.valueOf(value);
  }

  private record TransitionExpectation(String expectedActionType, String expectedInputHint) {}

  private record PhaseSearchResult(HintSearchPhase phase, List<HintVectorCandidate> candidates) {}
}
