package com.lucas.hint.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.hint.dto.response.HintEvidenceResponseDto;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** 힌트 오케스트레이터의 retrieval 엔드포인트(`/v1/hints/retrieve`) 호출 클라이언트입니다. */
@Component
@RequiredArgsConstructor
@Slf4j
public class HintRetrieveOrchestratorClient {

  private final ObjectMapper objectMapper;

  private final HttpClient httpClient =
      HttpClient.newBuilder()
          .connectTimeout(Duration.ofSeconds(5))
          .version(HttpClient.Version.HTTP_1_1)
          .build();

  @Value("${app.hint.orchestrator-service-url}")
  private String orchestratorServiceUrl;

  @Value("${app.hint.orchestrator-timeout-ms}")
  private int orchestratorTimeoutMs;

  public HintRetrieveResult retrieve(HintRetrieveRequest request) {
    try {
      String payload = objectMapper.writeValueAsString(request);
      HttpRequest httpRequest =
          HttpRequest.newBuilder()
              .uri(URI.create(resolveEndpointUrl()))
              .timeout(Duration.ofMillis(Math.max(1000, orchestratorTimeoutMs)))
              .header("Accept", "application/json")
              .header("Content-Type", "application/json")
              .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
              .build();

      HttpResponse<String> response =
          httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        log.error(
            "HintRetrieveOrchestratorClient upstream error. status={}, body={}",
            response.statusCode(),
            response.body());
        throw new CustomException(ErrorCode.G1000);
      }

      JsonNode body = objectMapper.readTree(response.body());
      String messageType = body.path("message_type").asText("none");
      String routeDecision = body.path("route_decision").asText("RAG_HINT");
      String intentSubtype = body.path("intent_subtype").asText("progress_hint");
      String selectedPhase = body.path("selected_phase").asText(null);
      boolean lowConfidence = body.path("low_confidence").asBoolean(false);
      int queryVectorDimension = body.path("query_vector_dimension").asInt(0);
      String queryText = body.path("query_text").asText("");
      int candidateCount = body.path("candidate_count").asInt(0);
      int repeatCountAfterAction = body.path("repeat_count_after_action").asInt(0);
      int stressScore = body.path("stress_score").asInt(0);
      String hintLevel = body.path("hint_level").asText("LIGHT");
      Map<String, Object> commandUsageContext = readOptionalObject(body.path("command_usage_context"));

      boolean blockedNonHint = "BLOCKED_NON_HINT".equals(routeDecision);
      if (selectedPhase == null || selectedPhase.isBlank()) {
        throw new CustomException(ErrorCode.G1000);
      }
      if (!blockedNonHint && queryVectorDimension <= 0) {
        throw new CustomException(ErrorCode.G1000);
      }

      List<HintEvidenceResponseDto> evidences = new ArrayList<>();
      JsonNode evidenceArray = body.path("evidences");
      if (evidenceArray.isArray()) {
        for (JsonNode item : evidenceArray) {
          Map<String, Object> metadata = readMetadata(item.path("metadata"));
          evidences.add(
              HintEvidenceResponseDto.builder()
                  .knowledgeId(asLong(item.path("knowledge_id")))
                  .transitionId(asLong(item.path("transition_id")))
                  .toNodeCode(asText(item.path("to_node_code")))
                  .actionType(asText(item.path("action_type")))
                  .similarity(item.path("similarity").asDouble(0.0))
                  .cosineDistance(item.path("cosine_distance").asDouble(0.0))
                  .priorityRank(item.path("priority_rank").asInt(9999))
                  .priority(item.path("priority").asInt(0))
                  .candidateCount(1)
                  .content(asText(item.path("content")))
                  .metadata(metadata)
                  .build());
        }
      }

      return new HintRetrieveResult(
          messageType,
          routeDecision,
          intentSubtype,
          selectedPhase,
          lowConfidence,
          queryVectorDimension,
          queryText,
          candidateCount,
          repeatCountAfterAction,
          stressScore,
          hintLevel,
          commandUsageContext,
          evidences);
    } catch (CustomException e) {
      throw e;
    } catch (Exception e) {
      log.error("HintRetrieveOrchestratorClient request error: {}", e.getMessage());
      throw new CustomException(ErrorCode.G1000);
    }
  }

  private String resolveEndpointUrl() {
    String base =
        orchestratorServiceUrl.endsWith("/")
            ? orchestratorServiceUrl.substring(0, orchestratorServiceUrl.length() - 1)
            : orchestratorServiceUrl;
    return base + "/v1/hints/retrieve";
  }

  private Map<String, Object> readMetadata(JsonNode node) {
    if (node == null || node.isMissingNode() || node.isNull()) {
      return Map.of();
    }
    Map<String, Object> result = new LinkedHashMap<>();
    node.fields()
        .forEachRemaining(entry -> result.put(entry.getKey(), objectValue(entry.getValue())));
    return result;
  }

  private Map<String, Object> readOptionalObject(JsonNode node) {
    if (node == null || node.isMissingNode() || node.isNull() || !node.isObject()) {
      return null;
    }
    return readMetadata(node);
  }

  private Object objectValue(JsonNode value) {
    if (value == null || value.isNull()) {
      return null;
    }
    if (value.isBoolean()) {
      return value.asBoolean();
    }
    if (value.isInt() || value.isLong()) {
      return value.asLong();
    }
    if (value.isFloat() || value.isDouble() || value.isBigDecimal()) {
      return value.asDouble();
    }
    if (value.isTextual()) {
      return value.asText();
    }
    if (value.isObject()) {
      return readMetadata(value);
    }
    if (value.isArray()) {
      List<Object> result = new ArrayList<>();
      value.forEach(item -> result.add(objectValue(item)));
      return result;
    }
    return value.asText();
  }

  private String asText(JsonNode node) {
    if (node == null || node.isMissingNode() || node.isNull()) {
      return null;
    }
    return node.asText();
  }

  private Long asLong(JsonNode node) {
    if (node == null || node.isMissingNode() || node.isNull()) {
      return null;
    }
    if (node.canConvertToLong()) {
      return node.asLong();
    }
    try {
      return Long.parseLong(node.asText());
    } catch (NumberFormatException e) {
      return null;
    }
  }

  @Getter
  @Builder
  public static class HintRetrieveRequest {
    private String session_id;
    private String chapter_id;
    private String from_node_id;
    private String action_type;
    private String current_input;
    private String user_message;
    private int fail_count_after_action;
    private String expected_action_type;
    private List<Map<String, Object>> recent_actions;
    private List<String> extra_context;
    private Map<String, Object> es_signal;
    private int search_top_k;
    private int evidence_limit;
    private double min_similarity;
    private Integer output_dimensionality;
  }

  public record HintRetrieveResult(
      String messageType,
      String routeDecision,
      String intentSubtype,
      String selectedPhase,
      boolean lowConfidence,
      int queryVectorDimension,
      String queryText,
      int candidateCount,
      int repeatCountAfterAction,
      int stressScore,
      String hintLevel,
      Map<String, Object> commandUsageContext,
      List<HintEvidenceResponseDto> evidences) {}
}
