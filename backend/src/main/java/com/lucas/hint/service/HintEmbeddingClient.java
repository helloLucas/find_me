package com.lucas.hint.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 임베딩 서비스(`/v1/hint/embed-query`) 호출 클라이언트입니다.
 *
 * <p>Redis/PG 기반 런타임 문맥을 query embedding으로 변환합니다.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class HintEmbeddingClient {

  private final ObjectMapper objectMapper;
  private final HttpClient httpClient =
      HttpClient.newBuilder()
          .connectTimeout(Duration.ofSeconds(5))
          .version(HttpClient.Version.HTTP_1_1)
          .build();

  @Value("${app.hint.embedding-service-url}")
  private String embeddingServiceUrl;

  public QueryEmbeddingResult embedQuery(QueryEmbeddingRequest request) {
    try {
      String payload = objectMapper.writeValueAsString(request.toPayload());
      HttpRequest httpRequest =
          HttpRequest.newBuilder()
              .uri(URI.create(resolveEndpointUrl()))
              .timeout(Duration.ofSeconds(20))
              .header("Accept", "application/json")
              .header("Content-Type", "application/json")
              .POST(HttpRequest.BodyPublishers.ofString(payload))
              .build();

      HttpResponse<String> response =
          httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
      int statusCode = response.statusCode();
      String responseBody = response.body();

      if (statusCode < 200 || statusCode >= 300) {
        log.error(
            "HintEmbeddingClient upstream error. status={}, body={}",
            statusCode,
            responseBody);
        throw new CustomException(ErrorCode.G1000);
      }

      JsonNode body = objectMapper.readTree(responseBody);

      if (body == null) {
        throw new CustomException(ErrorCode.G1000);
      }

      JsonNode embeddingNode = body.path("embedding");
      if (!embeddingNode.isArray() || embeddingNode.isEmpty()) {
        throw new CustomException(ErrorCode.G1000);
      }

      List<Double> vector = objectMapper.convertValue(embeddingNode, new TypeReference<>() {});
      String text = body.path("text").asText("");
      String model = body.path("model").asText("");

      return new QueryEmbeddingResult(model, text, vector);
    } catch (JsonProcessingException e) {
      log.error("HintEmbeddingClient payload serialization error: {}", e.getMessage());
      throw new CustomException(ErrorCode.G1000);
    } catch (Exception e) {
      log.error("HintEmbeddingClient request error: {}", e.getMessage());
      throw new CustomException(ErrorCode.G1000);
    }
  }

  private String resolveEndpointUrl() {
    String base = embeddingServiceUrl.endsWith("/") ? embeddingServiceUrl.substring(0, embeddingServiceUrl.length() - 1) : embeddingServiceUrl;
    return base + "/v1/hint/embed-query";
  }

  @Getter
  public static class QueryEmbeddingRequest {
    private final String chapter_id;
    private final String from_node_id;
    private final String action_type;
    private final String current_input;
    private final int fail_count_after_action;
    private final String expected_action_type;
    private final String expected_input_hint;
    private final List<Map<String, Object>> recent_actions;
    private final List<String> extra_context;
    private final Integer output_dimensionality;

    public QueryEmbeddingRequest(
        String chapterId,
        String fromNodeId,
        String actionType,
        String currentInput,
        int failCountAfterAction,
        String expectedActionType,
        String expectedInputHint,
        List<Map<String, Object>> recentActions,
        List<String> extraContext,
        Integer outputDimensionality) {
      this.chapter_id = chapterId;
      this.from_node_id = fromNodeId;
      this.action_type = actionType;
      this.current_input = currentInput;
      this.fail_count_after_action = failCountAfterAction;
      this.expected_action_type = expectedActionType;
      this.expected_input_hint = expectedInputHint;
      this.recent_actions = recentActions;
      this.extra_context = extraContext;
      this.output_dimensionality = outputDimensionality;
    }

    /**
     * FastAPI 스키마와 정확히 일치하는 요청 바디를 생성한다.
     *
     * <p>DTO 직렬화 환경 차이로 body가 비는 경우를 방지하기 위해 명시적 Map으로 전송한다.
     */
    public Map<String, Object> toPayload() {
      Map<String, Object> payload = new LinkedHashMap<>();
      payload.put("chapter_id", chapter_id);
      payload.put("from_node_id", from_node_id);
      payload.put("action_type", action_type);
      payload.put("current_input", current_input);
      payload.put("fail_count_after_action", fail_count_after_action);
      payload.put("expected_action_type", expected_action_type);
      payload.put("expected_input_hint", expected_input_hint);
      payload.put("recent_actions", recent_actions);
      payload.put("extra_context", extra_context);
      payload.put("output_dimensionality", output_dimensionality);
      return payload;
    }
  }

  public record QueryEmbeddingResult(String model, String text, List<Double> vector) {}
}
