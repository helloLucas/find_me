package com.lucas.admin.service;

import com.lucas.admin.dto.response.AdminFilterOptionsResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lucas.admin.dto.response.AdminEsAnalyticsResponse;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminEsAnalyticsServiceImpl implements AdminAnalyticsService {

  private static final DateTimeFormatter TS_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
  private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

  private static final int MIN_TOP_N = 5;
  private static final int MAX_TOP_N = 50;
  private static final int USER_SEARCH_MAX_LIMIT = 50;
  private static final int USER_TERMS_MAX_SIZE = 200;
  private static final int NODE_STAT_SIZE = 15;
  private static final int COMMAND_STAT_SIZE = 15;

  private final JdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;

  private final HttpClient httpClient =
      HttpClient.newBuilder()
          .connectTimeout(Duration.ofSeconds(3))
          .version(HttpClient.Version.HTTP_1_1)
          .build();

  @Value("${app.admin.analytics.es-enabled:false}")
  private boolean esEnabled;

  @Value("${app.admin.analytics.es-base-url:}")
  private String esBaseUrl;

  @Value("${app.admin.analytics.es-index-pattern:game-logs-*}")
  private String esIndexPattern;

  @Value("${app.admin.analytics.es-timeout-ms:3000}")
  private int esTimeoutMs;

  @Override
  public List<AdminEsAnalyticsResponse.UserOption> searchUsers(String keyword, int limit) {
    int safeLimit = clamp(limit, 1, USER_SEARCH_MAX_LIMIT);
    String q = sanitize(keyword);
    if (q == null) {
      return jdbcTemplate.query(
          """
          SELECT id, email, nickname, role
          FROM users
          ORDER BY last_login_at DESC NULLS LAST, id DESC
          LIMIT ?
          """,
          (rs, rowNum) -> mapUser(rs),
          safeLimit);
    }

    String like = "%" + q + "%";
    return jdbcTemplate.query(
        """
        SELECT id, email, nickname, role
        FROM users
        WHERE CAST(id AS text) ILIKE ?
           OR COALESCE(email, '') ILIKE ?
           OR COALESCE(nickname, '') ILIKE ?
        ORDER BY last_login_at DESC NULLS LAST, id DESC
        LIMIT ?
        """,
        (rs, rowNum) -> mapUser(rs),
        like,
        like,
        like,
        safeLimit);
  }

  @Override
  public AdminFilterOptionsResponse getFilterOptions(String chapterCode) {
    String safeChapterCode = sanitize(chapterCode);

    List<AdminFilterOptionsResponse.ChapterOption> chapters =
        jdbcTemplate.query(
            """
            SELECT c.code AS chapter_code, c.title AS chapter_title
            FROM chapters c
            ORDER BY c.sort_order ASC, c.id ASC
            """,
            (rs, rowNum) ->
                new AdminFilterOptionsResponse.ChapterOption(
                    rs.getString("chapter_code"), rs.getString("chapter_title")));

    List<AdminFilterOptionsResponse.NodeOption> nodes;
    if (safeChapterCode == null) {
      nodes =
          jdbcTemplate.query(
              """
              SELECT sn.code AS node_code, c.code AS chapter_code
              FROM story_nodes sn
              JOIN chapters c ON c.id = sn.chapter_id
              ORDER BY c.sort_order ASC, sn.id ASC
              """,
              (rs, rowNum) ->
                  new AdminFilterOptionsResponse.NodeOption(
                      rs.getString("node_code"), rs.getString("chapter_code")));
    } else {
      nodes =
          jdbcTemplate.query(
              """
              SELECT sn.code AS node_code, c.code AS chapter_code
              FROM story_nodes sn
              JOIN chapters c ON c.id = sn.chapter_id
              WHERE c.code = ?
              ORDER BY sn.id ASC
              """,
              (rs, rowNum) ->
                  new AdminFilterOptionsResponse.NodeOption(
                      rs.getString("node_code"), rs.getString("chapter_code")),
              safeChapterCode);
    }

    return new AdminFilterOptionsResponse(chapters, nodes);
  }

  @Override
  public AdminEsAnalyticsResponse getEsInsights(
      String from,
      String to,
      String timezone,
      List<Long> userIds,
      String chapterCode,
      String nodeCode,
      int topN) {
    List<Long> safeUserIds = normalizeUserIds(userIds);
    String safeChapterCode = sanitize(chapterCode);
    String safeNodeCode = sanitize(nodeCode);
    int safeTopN = clamp(topN, MIN_TOP_N, MAX_TOP_N);
    ZoneId zoneId = resolveZone(timezone);

    TimeRange range = resolveRange(from, to, zoneId);
    AdminEsAnalyticsResponse.Filter filter =
        new AdminEsAnalyticsResponse.Filter(
            range.fromText(),
            range.toText(),
            zoneId.getId(),
            safeUserIds,
            safeChapterCode,
            safeNodeCode,
            safeTopN);

    List<AdminEsAnalyticsResponse.UserOption> users = loadUsersByIds(safeUserIds);
    Map<Long, AdminEsAnalyticsResponse.UserOption> userMap =
        users.stream().collect(Collectors.toMap(AdminEsAnalyticsResponse.UserOption::userId, u -> u));

    if (!esEnabled || isBlank(esBaseUrl)) {
      return fallbackResponse(filter, "ES 비활성화 또는 URL 누락", userMap, safeUserIds);
    }

    try {
      String payload =
          objectMapper.writeValueAsString(
              buildEsPayload(range, zoneId, safeUserIds, safeChapterCode, safeNodeCode, safeTopN));
      String body = executeSearch(payload);
      JsonNode root = objectMapper.readTree(body);
      return parseResponse(filter, root, userMap, safeUserIds, safeTopN);
    } catch (Exception e) {
      log.warn("Admin ES analytics fallback: {}", e.getMessage());
      return fallbackResponse(filter, "ES 조회 실패: " + e.getMessage(), userMap, safeUserIds);
    }
  }

  private AdminEsAnalyticsResponse parseResponse(
      AdminEsAnalyticsResponse.Filter filter,
      JsonNode root,
      Map<Long, AdminEsAnalyticsResponse.UserOption> userMap,
      List<Long> selectedUserIds,
      int topN) {
    JsonNode aggs = root.path("aggregations");

    AdminEsAnalyticsResponse.Overview overview =
        new AdminEsAnalyticsResponse.Overview(
            readLong(root, "hits.total.value"),
            readLong(aggs, "success_docs.doc_count"),
            readLong(aggs, "fail_docs.doc_count"),
            readLong(aggs, "error_docs.doc_count"),
            readLong(aggs, "hint_docs.doc_count"),
            readLong(aggs, "unique_users.value"),
            readLong(aggs, "unique_sessions.value"),
            readLong(aggs, "command_docs.doc_count"),
            readLong(aggs, "inspect_docs.doc_count"),
            readLong(aggs, "click_docs.doc_count"));

    List<AdminEsAnalyticsResponse.TimelineRow> timeline = parseTimeline(aggs.path("timeline"));
    List<AdminEsAnalyticsResponse.NodeBottleneck> bottlenecks =
        parseBottlenecks(aggs.path("bottlenecks"));
    List<AdminEsAnalyticsResponse.FailCommand> failCommands =
        parseFailCommands(aggs.path("command_scope").path("commands"));

    List<AdminEsAnalyticsResponse.UserJourney> journeys =
        parseUserJourneys(aggs.path("users"), userMap, topN);

    AdminEsAnalyticsResponse.UserComparison comparison =
        buildComparison(journeys, selectedUserIds);

    return new AdminEsAnalyticsResponse(
        filter,
        new AdminEsAnalyticsResponse.Source(true, true, false, esIndexPattern, "ES 집계 기반"),
        overview,
        timeline,
        bottlenecks,
        failCommands,
        journeys,
        comparison);
  }

  private List<AdminEsAnalyticsResponse.TimelineRow> parseTimeline(JsonNode timelineAgg) {
    List<AdminEsAnalyticsResponse.TimelineRow> rows = new ArrayList<>();
    for (JsonNode bucket : buckets(timelineAgg)) {
      rows.add(
          new AdminEsAnalyticsResponse.TimelineRow(
              bucket.path("key_as_string").asText(""),
              bucket.path("doc_count").asLong(0),
              readLong(bucket, "success.doc_count"),
              readLong(bucket, "fail.doc_count"),
              readLong(bucket, "error.doc_count"),
              readLong(bucket, "hint.doc_count"),
              readLong(bucket, "unique_users.value")));
    }
    return rows;
  }

  private List<AdminEsAnalyticsResponse.NodeBottleneck> parseBottlenecks(JsonNode bottlenecksAgg) {
    List<AdminEsAnalyticsResponse.NodeBottleneck> rows = new ArrayList<>();
    for (JsonNode bucket : buckets(bottlenecksAgg)) {
      long total = bucket.path("doc_count").asLong(0);
      long fail = readLong(bucket, "fail.doc_count");
      long error = readLong(bucket, "error.doc_count");
      double failRate = total > 0 ? round2(((double) fail / (double) total) * 100.0) : 0.0;

      String chapter = "UNKNOWN";
      JsonNode chapterBucket = firstBucket(bucket.path("chapters"));
      if (chapterBucket != null) {
        chapter = chapterBucket.path("key").asText("UNKNOWN");
      }

      rows.add(
          new AdminEsAnalyticsResponse.NodeBottleneck(
              chapter, bucket.path("key").asText("UNKNOWN"), total, fail, error, failRate));
    }
    return rows;
  }

  private List<AdminEsAnalyticsResponse.FailCommand> parseFailCommands(JsonNode commandsAgg) {
    List<AdminEsAnalyticsResponse.FailCommand> rows = new ArrayList<>();
    for (JsonNode bucket : buckets(commandsAgg)) {
      rows.add(
          new AdminEsAnalyticsResponse.FailCommand(
              bucket.path("key").asText("(empty)"),
              bucket.path("doc_count").asLong(0),
              readLong(bucket, "fail.doc_count"),
              readLong(bucket, "error.doc_count"),
              readLong(bucket, "users.value")));
    }
    return rows;
  }

  private List<AdminEsAnalyticsResponse.UserJourney> parseUserJourneys(
      JsonNode usersAgg,
      Map<Long, AdminEsAnalyticsResponse.UserOption> userMap,
      int topN) {
    List<AdminEsAnalyticsResponse.UserJourney> rows = new ArrayList<>();
    for (JsonNode bucket : buckets(usersAgg)) {
      long userId = bucket.path("key").asLong(-1);
      if (userId <= 0) continue;

      AdminEsAnalyticsResponse.UserOption user =
          userMap.getOrDefault(
              userId, new AdminEsAnalyticsResponse.UserOption(userId, null, null, "UNKNOWN"));

      AdminEsAnalyticsResponse.UserSummary summary =
          new AdminEsAnalyticsResponse.UserSummary(
              bucket.path("doc_count").asLong(0),
              readLong(bucket, "success.doc_count"),
              readLong(bucket, "fail.doc_count"),
              readLong(bucket, "error.doc_count"),
              readLong(bucket, "hint.doc_count"),
              readLong(bucket, "sessions.value"),
              epochMillisToText(readDouble(bucket, "latest_ts.value")));

      List<AdminEsAnalyticsResponse.UserNodeStat> nodeStats = new ArrayList<>();
      List<AdminEsAnalyticsResponse.UserNodeActionSummary> nodeActionSummaries = new ArrayList<>();
      for (JsonNode node : buckets(bucket.path("top_nodes"))) {
        String nodeCode = node.path("key").asText("UNKNOWN");
        long totalCount = node.path("doc_count").asLong(0);
        long successCount = readLong(node, "success.doc_count");
        long failCount = readLong(node, "fail.doc_count");
        long errorCount = readLong(node, "error.doc_count");
        nodeStats.add(
            new AdminEsAnalyticsResponse.UserNodeStat(
                nodeCode, totalCount, successCount, failCount, errorCount));
        nodeActionSummaries.add(
            new AdminEsAnalyticsResponse.UserNodeActionSummary(
                nodeCode,
                totalCount,
                successCount,
                failCount,
                errorCount,
                parseNodeTopActions(node.path("top_actions"), Math.min(topN, 6))));
      }
      nodeStats =
          nodeStats.stream()
              .sorted(Comparator.comparingLong(AdminEsAnalyticsResponse.UserNodeStat::totalCount).reversed())
              .limit(topN)
              .toList();
      nodeActionSummaries =
          nodeActionSummaries.stream()
              .sorted(
                  Comparator.comparingLong(AdminEsAnalyticsResponse.UserNodeActionSummary::totalCount)
                      .reversed())
              .limit(topN)
              .toList();

      List<AdminEsAnalyticsResponse.UserCommandStat> commandStats = new ArrayList<>();
      for (JsonNode command : buckets(bucket.path("command_scope").path("by_command"))) {
        commandStats.add(
            new AdminEsAnalyticsResponse.UserCommandStat(
                command.path("key").asText("(empty)"),
                command.path("doc_count").asLong(0),
                readLong(command, "success.doc_count"),
                readLong(command, "fail.doc_count"),
                readLong(command, "error.doc_count")));
      }
      commandStats =
          commandStats.stream()
              .sorted(
                  Comparator.comparingLong(AdminEsAnalyticsResponse.UserCommandStat::totalCount)
                      .reversed())
              .limit(topN)
              .toList();

      rows.add(
          new AdminEsAnalyticsResponse.UserJourney(
              user, summary, nodeStats, commandStats, nodeActionSummaries));
    }
    return rows;
  }

  private List<AdminEsAnalyticsResponse.UserNodeActionItem> parseNodeTopActions(
      JsonNode topActionsAgg, int limit) {
    List<AdminEsAnalyticsResponse.UserNodeActionItem> actions = new ArrayList<>();
    for (JsonNode action : buckets(topActionsAgg)) {
      JsonNode actionTypeBucket = firstBucket(action.path("action_type"));
      String actionType = actionTypeBucket != null ? actionTypeBucket.path("key").asText("unknown") : "unknown";
      actions.add(
          new AdminEsAnalyticsResponse.UserNodeActionItem(
              actionType,
              action.path("key").asText("(empty)"),
              action.path("doc_count").asLong(0),
              readLong(action, "success.doc_count"),
              readLong(action, "fail.doc_count"),
              readLong(action, "error.doc_count")));
    }
    return actions.stream()
        .sorted(
            Comparator.comparingLong(AdminEsAnalyticsResponse.UserNodeActionItem::totalCount)
                .reversed())
        .limit(Math.max(1, limit))
        .toList();
  }

  private AdminEsAnalyticsResponse.UserComparison buildComparison(
      List<AdminEsAnalyticsResponse.UserJourney> journeys, List<Long> selectedUserIds) {
    if (selectedUserIds == null || selectedUserIds.size() != 2) {
      return emptyComparison();
    }
    long leftId = selectedUserIds.get(0);
    long rightId = selectedUserIds.get(1);

    AdminEsAnalyticsResponse.UserJourney left =
        journeys.stream().filter(j -> j.user().userId() == leftId).findFirst().orElse(null);
    AdminEsAnalyticsResponse.UserJourney right =
        journeys.stream().filter(j -> j.user().userId() == rightId).findFirst().orElse(null);
    if (left == null || right == null) {
      return emptyComparison();
    }

    Map<String, AdminEsAnalyticsResponse.UserNodeStat> leftNodes =
        left.nodeStats().stream()
            .collect(Collectors.toMap(AdminEsAnalyticsResponse.UserNodeStat::nodeCode, n -> n));
    Map<String, AdminEsAnalyticsResponse.UserNodeStat> rightNodes =
        right.nodeStats().stream()
            .collect(Collectors.toMap(AdminEsAnalyticsResponse.UserNodeStat::nodeCode, n -> n));

    Set<String> nodeKeys = new LinkedHashSet<>();
    nodeKeys.addAll(leftNodes.keySet());
    nodeKeys.addAll(rightNodes.keySet());

    List<AdminEsAnalyticsResponse.UserNodeComparisonRow> nodeRows = new ArrayList<>();
    for (String key : nodeKeys) {
      AdminEsAnalyticsResponse.UserNodeStat l = leftNodes.get(key);
      AdminEsAnalyticsResponse.UserNodeStat r = rightNodes.get(key);
      nodeRows.add(
          new AdminEsAnalyticsResponse.UserNodeComparisonRow(
              key,
              l != null ? l.totalCount() : 0,
              l != null ? l.successCount() : 0,
              l != null ? l.failCount() : 0,
              l != null ? l.errorCount() : 0,
              r != null ? r.totalCount() : 0,
              r != null ? r.successCount() : 0,
              r != null ? r.failCount() : 0,
              r != null ? r.errorCount() : 0));
    }
    nodeRows.sort(
        (a, b) -> Long.compare((b.leftTotal() + b.rightTotal()), (a.leftTotal() + a.rightTotal())));

    Map<String, AdminEsAnalyticsResponse.UserCommandStat> leftCommands =
        left.commandStats().stream()
            .collect(Collectors.toMap(AdminEsAnalyticsResponse.UserCommandStat::command, c -> c));
    Map<String, AdminEsAnalyticsResponse.UserCommandStat> rightCommands =
        right.commandStats().stream()
            .collect(Collectors.toMap(AdminEsAnalyticsResponse.UserCommandStat::command, c -> c));

    Set<String> commandKeys = new LinkedHashSet<>();
    commandKeys.addAll(leftCommands.keySet());
    commandKeys.addAll(rightCommands.keySet());

    List<AdminEsAnalyticsResponse.UserCommandComparisonRow> commandRows = new ArrayList<>();
    for (String key : commandKeys) {
      AdminEsAnalyticsResponse.UserCommandStat l = leftCommands.get(key);
      AdminEsAnalyticsResponse.UserCommandStat r = rightCommands.get(key);
      commandRows.add(
          new AdminEsAnalyticsResponse.UserCommandComparisonRow(
              key,
              l != null ? l.totalCount() : 0,
              l != null ? l.successCount() : 0,
              l != null ? l.failCount() : 0,
              l != null ? l.errorCount() : 0,
              r != null ? r.totalCount() : 0,
              r != null ? r.successCount() : 0,
              r != null ? r.failCount() : 0,
              r != null ? r.errorCount() : 0));
    }
    commandRows.sort(
        (a, b) -> Long.compare((b.leftTotal() + b.rightTotal()), (a.leftTotal() + a.rightTotal())));

    return new AdminEsAnalyticsResponse.UserComparison(
        true,
        leftId,
        rightId,
        left.summary(),
        right.summary(),
        nodeRows,
        commandRows);
  }

  private AdminEsAnalyticsResponse.UserComparison emptyComparison() {
    AdminEsAnalyticsResponse.UserSummary emptySummary =
        new AdminEsAnalyticsResponse.UserSummary(0, 0, 0, 0, 0, 0, null);
    return new AdminEsAnalyticsResponse.UserComparison(
        false, null, null, emptySummary, emptySummary, List.of(), List.of());
  }

  private AdminEsAnalyticsResponse fallbackResponse(
      AdminEsAnalyticsResponse.Filter filter,
      String reason,
      Map<Long, AdminEsAnalyticsResponse.UserOption> userMap,
      List<Long> selectedUserIds) {
    List<AdminEsAnalyticsResponse.UserJourney> journeys = new ArrayList<>();
    for (Long userId : selectedUserIds) {
      AdminEsAnalyticsResponse.UserOption user =
          userMap.getOrDefault(
              userId, new AdminEsAnalyticsResponse.UserOption(userId, null, null, "UNKNOWN"));
      journeys.add(
          new AdminEsAnalyticsResponse.UserJourney(
              user,
              new AdminEsAnalyticsResponse.UserSummary(0, 0, 0, 0, 0, 0, null),
              List.of(),
              List.of(),
              List.of()));
    }

    return new AdminEsAnalyticsResponse(
        filter,
        new AdminEsAnalyticsResponse.Source(
            esEnabled, false, true, esIndexPattern, reason == null ? "fallback" : reason),
        new AdminEsAnalyticsResponse.Overview(0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
        List.of(),
        List.of(),
        List.of(),
        journeys,
        emptyComparison());
  }

  private List<AdminEsAnalyticsResponse.UserOption> loadUsersByIds(List<Long> userIds) {
    if (userIds == null || userIds.isEmpty()) {
      return List.of();
    }
    String placeholders = String.join(",", Collections.nCopies(userIds.size(), "?"));
    return jdbcTemplate.query(
        "SELECT id, email, nickname, role FROM users WHERE id IN (" + placeholders + ")",
        (rs, rowNum) -> mapUser(rs),
        userIds.toArray());
  }

  private AdminEsAnalyticsResponse.UserOption mapUser(ResultSet rs) throws java.sql.SQLException {
    return new AdminEsAnalyticsResponse.UserOption(
        rs.getLong("id"), rs.getString("email"), rs.getString("nickname"), rs.getString("role"));
  }

  private Map<String, Object> buildEsPayload(
      TimeRange range,
      ZoneId zoneId,
      List<Long> userIds,
      String chapterCode,
      String nodeCode,
      int topN) {
    List<Map<String, Object>> filters = new ArrayList<>();
    filters.add(
        Map.of(
            "range",
            Map.of(
                "timestamp",
                Map.of(
                    "gte", range.fromIso(),
                    "lte", range.toIso(),
                    "format", "strict_date_optional_time"))));

    if (!userIds.isEmpty()) {
      filters.add(Map.of("terms", Map.of("user_id", userIds)));
    }
    if (!isBlank(chapterCode)) {
      filters.add(Map.of("term", Map.of("chapter_id", chapterCode)));
    }
    if (!isBlank(nodeCode)) {
      filters.add(
          Map.of(
              "bool",
              Map.of(
                  "should",
                  List.of(
                      Map.of("term", Map.of("from_node_id", nodeCode)),
                      Map.of("term", Map.of("to_node_id", nodeCode))),
                  "minimum_should_match",
                  1)));
    }

    Map<String, Object> root = new LinkedHashMap<>();
    root.put("size", 0);
    root.put("query", Map.of("bool", Map.of("filter", filters)));

    Map<String, Object> aggs = new LinkedHashMap<>();
    aggs.put("success_docs", Map.of("filter", Map.of("term", Map.of("result", "SUCCESS"))));
    aggs.put("fail_docs", Map.of("filter", Map.of("term", Map.of("result", "FAIL"))));
    aggs.put("error_docs", Map.of("filter", Map.of("term", Map.of("result", "ERROR"))));
    aggs.put("hint_docs", Map.of("filter", Map.of("term", Map.of("hint_requested", true))));
    aggs.put("command_docs", Map.of("filter", Map.of("term", Map.of("action_type", "command"))));
    aggs.put("inspect_docs", Map.of("filter", Map.of("term", Map.of("action_type", "inspect"))));
    aggs.put("click_docs", Map.of("filter", Map.of("term", Map.of("action_type", "click"))));
    aggs.put("unique_users", Map.of("cardinality", Map.of("field", "user_id")));
    aggs.put("unique_sessions", Map.of("cardinality", Map.of("field", "session_id")));

    Map<String, Object> timelineAgg = new LinkedHashMap<>();
    timelineAgg.put(
        "date_histogram",
        Map.of(
            "field", "timestamp",
            "calendar_interval", "1d",
            "time_zone", zoneId.getId(),
            "min_doc_count", 0,
            "format", "yyyy-MM-dd",
            "extended_bounds", Map.of("min", range.fromDate(), "max", range.toDate())));
    timelineAgg.put(
        "aggs",
        Map.of(
            "success", Map.of("filter", Map.of("term", Map.of("result", "SUCCESS"))),
            "fail", Map.of("filter", Map.of("term", Map.of("result", "FAIL"))),
            "error", Map.of("filter", Map.of("term", Map.of("result", "ERROR"))),
            "hint", Map.of("filter", Map.of("term", Map.of("hint_requested", true))),
            "unique_users", Map.of("cardinality", Map.of("field", "user_id"))));
    aggs.put("timeline", timelineAgg);

    Map<String, Object> bottleneckAgg = new LinkedHashMap<>();
    bottleneckAgg.put(
        "terms",
        Map.of("field", "from_node_id", "size", topN, "missing", "UNKNOWN", "order", Map.of("_count", "desc")));
    bottleneckAgg.put(
        "aggs",
        Map.of(
            "fail", Map.of("filter", Map.of("term", Map.of("result", "FAIL"))),
            "error", Map.of("filter", Map.of("term", Map.of("result", "ERROR"))),
            "chapters", Map.of("terms", Map.of("field", "chapter_id", "size", 1, "missing", "UNKNOWN"))));
    aggs.put("bottlenecks", bottleneckAgg);

    Map<String, Object> commandScope = new LinkedHashMap<>();
    commandScope.put("filter", Map.of("term", Map.of("action_type", "command")));
    commandScope.put(
        "aggs",
        Map.of(
            "commands",
            Map.of(
                "terms",
                Map.of("field", "input_value_norm", "size", topN, "missing", "(empty)"),
                "aggs",
                Map.of(
                    "fail", Map.of("filter", Map.of("term", Map.of("result", "FAIL"))),
                    "error", Map.of("filter", Map.of("term", Map.of("result", "ERROR"))),
                    "users", Map.of("cardinality", Map.of("field", "user_id"))))));
    aggs.put("command_scope", commandScope);

    int userBucketSize = Math.max(userIds.size(), 20);
    userBucketSize = clamp(userBucketSize, 2, USER_TERMS_MAX_SIZE);
    Map<String, Object> userAgg = new LinkedHashMap<>();
    userAgg.put("terms", Map.of("field", "user_id", "size", userBucketSize));
    userAgg.put(
        "aggs",
        Map.of(
            "success", Map.of("filter", Map.of("term", Map.of("result", "SUCCESS"))),
            "fail", Map.of("filter", Map.of("term", Map.of("result", "FAIL"))),
            "error", Map.of("filter", Map.of("term", Map.of("result", "ERROR"))),
            "hint", Map.of("filter", Map.of("term", Map.of("hint_requested", true))),
            "sessions", Map.of("cardinality", Map.of("field", "session_id")),
            "latest_ts", Map.of("max", Map.of("field", "timestamp")),
            "top_nodes",
                Map.of(
                    "terms",
                    Map.of("field", "from_node_id", "size", NODE_STAT_SIZE, "missing", "UNKNOWN"),
                    "aggs",
                    Map.of(
                        "success", Map.of("filter", Map.of("term", Map.of("result", "SUCCESS"))),
                        "fail", Map.of("filter", Map.of("term", Map.of("result", "FAIL"))),
                        "error", Map.of("filter", Map.of("term", Map.of("result", "ERROR"))),
                        "top_actions",
                            Map.of(
                                "terms",
                                Map.of(
                                    "field",
                                    "input_value_norm",
                                    "size",
                                    COMMAND_STAT_SIZE,
                                    "missing",
                                    "(empty)"),
                                "aggs",
                                    Map.of(
                                        "action_type",
                                            Map.of(
                                                "terms",
                                                Map.of("field", "action_type", "size", 1)),
                                        "success",
                                            Map.of(
                                                "filter",
                                                Map.of("term", Map.of("result", "SUCCESS"))),
                                        "fail",
                                            Map.of(
                                                "filter",
                                                Map.of("term", Map.of("result", "FAIL"))),
                                        "error",
                                            Map.of(
                                                "filter",
                                                Map.of("term", Map.of("result", "ERROR"))))))),
            "command_scope",
                Map.of(
                    "filter", Map.of("term", Map.of("action_type", "command")),
                    "aggs",
                        Map.of(
                            "by_command",
                            Map.of(
                                "terms",
                                Map.of(
                                    "field",
                                    "input_value_norm",
                                    "size",
                                    COMMAND_STAT_SIZE,
                                    "missing",
                                    "(empty)"),
                                "aggs",
                                    Map.of(
                                        "success",
                                            Map.of(
                                                "filter",
                                                Map.of("term", Map.of("result", "SUCCESS"))),
                                        "fail",
                                            Map.of(
                                                "filter",
                                                Map.of("term", Map.of("result", "FAIL"))),
                                        "error",
                                            Map.of(
                                                "filter",
                                                Map.of("term", Map.of("result", "ERROR")))))))));
    aggs.put("users", userAgg);

    root.put("aggs", aggs);
    return root;
  }

  private String executeSearch(String payload) throws Exception {
    String endpoint = resolveEndpointUrl();
    HttpRequest request =
        HttpRequest.newBuilder()
            .uri(URI.create(endpoint))
            .timeout(Duration.ofMillis(Math.max(1000, esTimeoutMs)))
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(payload, StandardCharsets.UTF_8))
            .build();

    HttpResponse<String> response =
        httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    if (response.statusCode() < 200 || response.statusCode() >= 300) {
      throw new IllegalStateException(
          "ES status=" + response.statusCode() + ", body=" + trimTo(response.body(), 400));
    }
    return response.body();
  }

  private String resolveEndpointUrl() {
    String base = esBaseUrl.endsWith("/") ? esBaseUrl.substring(0, esBaseUrl.length() - 1) : esBaseUrl;
    String encodedPattern = URLEncoder.encode(esIndexPattern, StandardCharsets.UTF_8);
    return base + "/" + encodedPattern + "/_search";
  }

  private long readLong(JsonNode root, String path) {
    JsonNode node = traverse(root, path);
    if (node == null || node.isMissingNode() || node.isNull()) return 0L;
    if (node.isNumber()) return node.asLong(0);
    String text = node.asText("");
    if (text.isBlank()) return 0L;
    try {
      return (long) Double.parseDouble(text);
    } catch (NumberFormatException e) {
      return 0L;
    }
  }

  private double readDouble(JsonNode root, String path) {
    JsonNode node = traverse(root, path);
    if (node == null || node.isMissingNode() || node.isNull()) return 0.0;
    if (node.isNumber()) return node.asDouble(0);
    String text = node.asText("");
    if (text.isBlank()) return 0.0;
    try {
      return Double.parseDouble(text);
    } catch (NumberFormatException e) {
      return 0.0;
    }
  }

  private JsonNode traverse(JsonNode root, String dottedPath) {
    JsonNode node = root;
    for (String token : dottedPath.split("\\.")) {
      if (node == null) return null;
      node = node.path(token);
    }
    return node;
  }

  private List<JsonNode> buckets(JsonNode aggNode) {
    if (aggNode == null) return List.of();
    JsonNode buckets = aggNode.path("buckets");
    if (!buckets.isArray()) return List.of();
    List<JsonNode> rows = new ArrayList<>();
    buckets.forEach(rows::add);
    return rows;
  }

  private JsonNode firstBucket(JsonNode aggNode) {
    JsonNode buckets = aggNode.path("buckets");
    if (!buckets.isArray() || buckets.isEmpty()) return null;
    return buckets.get(0);
  }

  private String epochMillisToText(double epochMillis) {
    if (epochMillis <= 0) return null;
    long millis = (long) epochMillis;
    ZonedDateTime zdt = ZonedDateTime.ofInstant(java.time.Instant.ofEpochMilli(millis), ZoneId.systemDefault());
    return zdt.toLocalDateTime().format(TS_FMT);
  }

  private ZoneId resolveZone(String timezone) {
    String input = sanitize(timezone);
    if (input == null) return ZoneId.of("Asia/Seoul");
    try {
      return ZoneId.of(input);
    } catch (Exception e) {
      return ZoneId.of("Asia/Seoul");
    }
  }

  private TimeRange resolveRange(String from, String to, ZoneId zoneId) {
    ZonedDateTime now = ZonedDateTime.now(zoneId);
    ZonedDateTime startDefault = now.minusDays(6).with(LocalTime.MIN);
    ZonedDateTime endDefault = now;

    ZonedDateTime fromTime = parseDateTime(from, zoneId, true);
    ZonedDateTime toTime = parseDateTime(to, zoneId, false);
    if (fromTime == null) fromTime = startDefault;
    if (toTime == null) toTime = endDefault;
    if (fromTime.isAfter(toTime)) {
      ZonedDateTime tmp = fromTime;
      fromTime = toTime.with(LocalTime.MIN);
      toTime = tmp.with(LocalTime.MAX);
    }

    return new TimeRange(
        fromTime.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
        toTime.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
        fromTime.format(DAY_FMT),
        toTime.format(DAY_FMT),
        fromTime.format(TS_FMT),
        toTime.format(TS_FMT));
  }

  private ZonedDateTime parseDateTime(String input, ZoneId zoneId, boolean startOfDayWhenDateOnly) {
    String value = sanitize(input);
    if (value == null) return null;

    try {
      return OffsetDateTime.parse(value).atZoneSameInstant(zoneId);
    } catch (DateTimeParseException ignored) {
    }
    try {
      LocalDateTime ldt = LocalDateTime.parse(value);
      return ldt.atZone(zoneId);
    } catch (DateTimeParseException ignored) {
    }
    try {
      LocalDate date = LocalDate.parse(value);
      return date.atTime(startOfDayWhenDateOnly ? LocalTime.MIN : LocalTime.MAX).atZone(zoneId);
    } catch (DateTimeParseException ignored) {
    }
    return null;
  }

  private String sanitize(String value) {
    if (value == null) return null;
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private List<Long> normalizeUserIds(List<Long> userIds) {
    if (userIds == null || userIds.isEmpty()) return List.of();
    return userIds.stream()
        .filter(Objects::nonNull)
        .filter(id -> id > 0)
        .distinct()
        .toList();
  }

  private int clamp(int value, int min, int max) {
    return Math.max(min, Math.min(max, value));
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private double round2(double value) {
    return Math.round(value * 100.0) / 100.0;
  }

  private String trimTo(String value, int maxLen) {
    if (value == null) return "";
    if (value.length() <= maxLen) return value;
    return value.substring(0, maxLen) + "...";
  }

  private record TimeRange(
      String fromIso, String toIso, String fromDate, String toDate, String fromText, String toText) {}
}
