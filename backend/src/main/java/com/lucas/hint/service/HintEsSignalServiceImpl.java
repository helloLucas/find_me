package com.lucas.hint.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lucas.hint.dto.response.HintEsSignalResponseDto;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** ES 연결이 활성화된 경우 힌트 보정용 집계 신호를 조회한다. */
@Service
@RequiredArgsConstructor
@Slf4j
public class HintEsSignalServiceImpl implements HintEsSignalService {

  private final ObjectMapper objectMapper;

  private final HttpClient httpClient =
      HttpClient.newBuilder()
          .connectTimeout(Duration.ofSeconds(3))
          .version(HttpClient.Version.HTTP_1_1)
          .build();

  @Value("${app.hint.es-enabled}")
  private boolean esEnabled;

  @Value("${app.hint.es-base-url}")
  private String esBaseUrl;

  @Value("${app.hint.es-index-pattern}")
  private String esIndexPattern;

  @Value("${app.hint.es-timeout-ms}")
  private int esTimeoutMs;

  @Override
  public Optional<HintEsSignalResponseDto> loadSignals(
      String chapterCode, String fromNodeCode, String actionType) {
    if (!esEnabled || isBlank(esBaseUrl)) {
      return Optional.empty();
    }

    try {
      String endpoint = resolveEndpointUrl();
      String payload =
          objectMapper.writeValueAsString(buildQuery(chapterCode, fromNodeCode, actionType));

      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(endpoint))
              .timeout(Duration.ofMillis(Math.max(500, esTimeoutMs)))
              .header("Accept", "application/json")
              .header("Content-Type", "application/json")
              .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
              .build();

      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        log.warn(
            "HintEsSignalService upstream error. status={}, body={}",
            response.statusCode(),
            response.body());
        return Optional.empty();
      }

      JsonNode root = objectMapper.readTree(response.body());
      return Optional.of(parseSignal(root));
    } catch (Exception e) {
      log.warn("HintEsSignalService disabled by runtime error: {}", e.getMessage());
      return Optional.empty();
    }
  }

  private Map<String, Object> buildQuery(
      String chapterCode, String fromNodeCode, String actionType) {
    List<Map<String, Object>> filters = new ArrayList<>();
    filters.add(Map.of("term", Map.of("chapter_id", chapterCode)));
    filters.add(Map.of("term", Map.of("from_node_id", fromNodeCode)));
    if (!isBlank(actionType)) {
      filters.add(Map.of("term", Map.of("action_type", actionType)));
    }

    Map<String, Object> topWrongInputsAgg =
        Map.of(
            "filter",
            Map.of("term", Map.of("result", "FAIL")),
            "aggs",
            Map.of("values", Map.of("terms", Map.of("field", "input_value_norm", "size", 5))));

    Map<String, Object> query = new LinkedHashMap<>();
    query.put("size", 0);
    query.put("query", Map.of("bool", Map.of("filter", filters)));
    query.put(
        "aggs",
        Map.of(
            "fail_docs", Map.of("filter", Map.of("term", Map.of("result", "FAIL"))),
            "hint_requested_docs", Map.of("filter", Map.of("term", Map.of("hint_requested", true))),
            "top_wrong_inputs", topWrongInputsAgg));
    return query;
  }

  private HintEsSignalResponseDto parseSignal(JsonNode root) {
    long totalCount = root.path("hits").path("total").path("value").asLong(0);
    JsonNode aggs = root.path("aggregations");
    long failCount = aggs.path("fail_docs").path("doc_count").asLong(0);
    long hintRequestedCount = aggs.path("hint_requested_docs").path("doc_count").asLong(0);

    List<String> topWrongInputs = new ArrayList<>();
    JsonNode buckets = aggs.path("top_wrong_inputs").path("values").path("buckets");
    if (buckets.isArray()) {
      for (JsonNode bucket : buckets) {
        String value = bucket.path("key").asText(null);
        if (!isBlank(value)) {
          topWrongInputs.add(value);
        }
      }
    }

    double failRate = totalCount > 0 ? (double) failCount / (double) totalCount : 0.0d;
    double hintRequestRate =
        totalCount > 0 ? (double) hintRequestedCount / (double) totalCount : 0.0d;

    return HintEsSignalResponseDto.builder()
        .totalActionCount(totalCount)
        .failActionCount(failCount)
        .nodeFailRate(failRate)
        .hintRequestRate(hintRequestRate)
        .topWrongInputs(topWrongInputs)
        .build();
  }

  private String resolveEndpointUrl() {
    String base =
        esBaseUrl.endsWith("/") ? esBaseUrl.substring(0, esBaseUrl.length() - 1) : esBaseUrl;
    String encodedPattern = URLEncoder.encode(esIndexPattern, StandardCharsets.UTF_8);
    return base + "/" + encodedPattern + "/_search";
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
