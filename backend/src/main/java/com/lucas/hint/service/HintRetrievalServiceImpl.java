package com.lucas.hint.service;

import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.hint.dto.request.HintLiveRetrieveRequestDto;
import com.lucas.hint.dto.response.HintLiveRetrieveResponseDto;
import com.lucas.progress.entity.UserStoryProgress;
import com.lucas.progress.repository.UserStoryProgressRepository;
import com.lucas.story.entity.StoryTransition;
import com.lucas.story.repository.StoryTransitionRepository;
import com.lucas.story.service.redis.StoryRecentEvent;
import com.lucas.story.service.redis.StorySessionRedisService;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 온디맨드 힌트 검색 오케스트레이터입니다.
 *
 * <p>백엔드는 런타임 컨텍스트만 수집하고, 실제 임베딩+벡터검색은 hint-orchestrator(`/v1/hints/retrieve`)에 위임합니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@Slf4j
public class HintRetrievalServiceImpl implements HintRetrievalService {

  private static final int DEFAULT_RECENT_ACTION_LIMIT = 3;
  private static final int MAX_SEARCH_TOP_K = 5;
  private static final int MAX_EVIDENCE_LIMIT = 5;
  private static final int MAX_RECENT_ACTION_LIMIT = 3;
  private static final int REQUIRED_VECTOR_DIMENSION = 1536;
  private final UserStoryProgressRepository userStoryProgressRepository;
  private final StoryTransitionRepository storyTransitionRepository;
  private final StorySessionRedisService storySessionRedisService;
  private final HintRetrieveOrchestratorClient hintRetrieveOrchestratorClient;

  @Value("${app.hint.search-top-k}")
  private int defaultSearchTopK;

  @Value("${app.hint.evidence-limit}")
  private int defaultEvidenceLimit;

  @Value("${app.hint.min-similarity}")
  private double defaultMinSimilarity;

  @Value("${app.hint.recent-action-limit}")
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

    List<StoryRecentEvent> recentEvents =
        storySessionRedisService.getRecentEvents(sessionId, resolveRecentLimit());
    int failCount = storySessionRedisService.getFailCount(sessionId);

    StoryRecentEvent latestEvent = recentEvents.isEmpty() ? null : recentEvents.get(0);
    String actionType = latestEvent != null ? latestEvent.actionType() : null;
    String currentInput = latestEvent != null ? latestEvent.inputValueNorm() : null;

    String expectedActionType = resolveExpectedActionType(progress.getLatestNode().getId());

    HintRetrieveOrchestratorClient.HintRetrieveResult result =
        hintRetrieveOrchestratorClient.retrieve(
            HintRetrieveOrchestratorClient.HintRetrieveRequest.builder()
                .session_id(sessionId)
                .chapter_id(chapterCode)
                .from_node_id(fromNodeCode)
                .action_type(actionType)
                .current_input(currentInput)
                .user_message(request.getUserMessage())
                .fail_count_after_action(failCount)
                .expected_action_type(expectedActionType)
                .recent_actions(mapRecentActions(recentEvents))
                .extra_context(buildExtraContext(sessionId, fromNodeCode))
                .es_signal(null)
                .search_top_k(searchTopK)
                .evidence_limit(evidenceLimit)
                .min_similarity(minSimilarity)
                .output_dimensionality(REQUIRED_VECTOR_DIMENSION)
                .build());

    return HintLiveRetrieveResponseDto.builder()
        .sessionId(sessionId)
        .userId(userId)
        .chapterCode(chapterCode)
        .fromNodeCode(fromNodeCode)
        .messageType(result.messageType())
        .routeDecision(result.routeDecision())
        .actionType(actionType)
        .failCountAfterAction(failCount)
        .repeatCountAfterAction(result.repeatCountAfterAction())
        .stressScore(result.stressScore())
        .hintLevel(result.hintLevel())
        .repeatDecision("orchestrated")
        .queryVectorDimension(result.queryVectorDimension())
        .queryText(result.queryText())
        .selectedPhase(result.selectedPhase())
        .lowConfidence(result.lowConfidence())
        .searchTopK(searchTopK)
        .evidenceLimit(evidenceLimit)
        .minSimilarity(minSimilarity)
        .candidateCount(result.candidateCount())
        .evidences(result.evidences())
        .build();
  }

  private String resolveExpectedActionType(Long fromNodeId) {
    List<StoryTransition> transitions =
        storyTransitionRepository.findByFromNode_IdOrderByPriorityDesc(fromNodeId);

    for (StoryTransition transition : transitions) {
      if (transition.getToNode() != null
          && transition.getToNode().getCode() != null
          && transition.getToNode().getCode().contains("_FAIL_")) {
        continue;
      }
      return transition.getActionType();
    }
    return null;
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

  private String resolveSessionId(Long userId, String requestedSessionId) {
    if (requestedSessionId != null && !requestedSessionId.isBlank()) {
      return requestedSessionId;
    }
    return "sess_user_" + userId;
  }

  private int resolveSearchTopK(Integer requested) {
    int value = requested != null ? requested : defaultSearchTopK;
    return Math.max(1, Math.min(value, MAX_SEARCH_TOP_K));
  }

  private int resolveEvidenceLimit(Integer requested, int searchTopK) {
    int limit = requested != null ? requested : defaultEvidenceLimit;
    limit = Math.max(1, Math.min(limit, MAX_EVIDENCE_LIMIT));
    return Math.min(limit, searchTopK);
  }

  private double resolveMinSimilarity(Double requested) {
    return requested != null ? requested : defaultMinSimilarity;
  }

  private int resolveRecentLimit() {
    int value = recentActionLimit > 0 ? recentActionLimit : DEFAULT_RECENT_ACTION_LIMIT;
    return Math.max(1, Math.min(value, MAX_RECENT_ACTION_LIMIT));
  }
}
