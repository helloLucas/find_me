package com.lucas.hint.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.hint.dto.response.HintEsSignalResponseDto;
import com.lucas.hint.dto.response.HintEvidenceResponseDto;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** 외부 힌트 호출부(LLM 오케스트레이터)와 통신하는 클라이언트입니다. */
@Component
@RequiredArgsConstructor
@Slf4j
public class HintLlmOrchestratorClient {

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

  public HintGenerationResult generate(HintGenerationRequest request) {
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
            "HintLlmOrchestratorClient upstream error. status={}, body={}",
            response.statusCode(),
            response.body());
        throw new CustomException(ErrorCode.G1000);
      }

      JsonNode body = objectMapper.readTree(response.body());
      String hintText = body.path("hint_text").asText(null);
      String hintLevel = body.path("hint_level").asText(null);

      if (hintText == null || hintText.isBlank() || hintLevel == null || hintLevel.isBlank()) {
        throw new CustomException(ErrorCode.G1000);
      }

      return new HintGenerationResult(hintText, hintLevel);
    } catch (CustomException e) {
      throw e;
    } catch (Exception e) {
      log.error("HintLlmOrchestratorClient request error: {}", e.getMessage());
      throw new CustomException(ErrorCode.G1000);
    }
  }

  private String resolveEndpointUrl() {
    String base =
        orchestratorServiceUrl.endsWith("/")
            ? orchestratorServiceUrl.substring(0, orchestratorServiceUrl.length() - 1)
            : orchestratorServiceUrl;
    return base + "/v1/hints/generate";
  }

  @Getter
  @Builder
  public static class HintGenerationRequest {
    @JsonProperty("session_id")
    private String sessionId;

    @JsonProperty("user_id")
    private Long userId;

    @JsonProperty("chapter_code")
    private String chapterCode;

    @JsonProperty("from_node_code")
    private String fromNodeCode;

    @JsonProperty("action_type")
    private String actionType;

    @JsonProperty("user_message")
    private String userMessage;

    @JsonProperty("fail_count_after_action")
    private int failCountAfterAction;

    @JsonProperty("selected_phase")
    private String selectedPhase;

    @JsonProperty("low_confidence")
    private boolean lowConfidence;

    @JsonProperty("query_text")
    private String queryText;

    private List<HintEvidenceResponseDto> evidences;

    @JsonProperty("es_signal")
    private HintEsSignalResponseDto esSignal;
  }

  public record HintGenerationResult(String hintText, String hintLevel) {}
}
