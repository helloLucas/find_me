package com.lucas.admin.service;

import com.lucas.admin.dto.response.AdminDashboardResponse;
import com.lucas.admin.dto.response.AdminInsightsResponse;
import com.lucas.story.service.redis.StoryRecentEvent;
import com.lucas.story.service.redis.StorySessionRedisService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminDashboardServiceImpl implements AdminDashboardService {

  private static final DateTimeFormatter TS_FMT =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
  private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
  private static final int MAX_USER_LIMIT = 500;
  private static final int MAX_RECENT_LIMIT = 200;
  private static final int MAX_DAYS = 90;

  private final JdbcTemplate jdbcTemplate;
  private final StorySessionRedisService storySessionRedisService;

  @Override
  public AdminDashboardResponse getDashboard(int userLimit) {
    int safeLimit = clamp(userLimit, 1, MAX_USER_LIMIT);
    return new AdminDashboardResponse(
        loadDashboardSummary(), loadDashboardChapterStats(), loadDashboardUsers(safeLimit));
  }

  @Override
  public AdminInsightsResponse getInsights(
      List<Long> userIds,
      String chapterCode,
      String nodeCode,
      int userLimit,
      int recentLimit,
      int days) {
    List<Long> safeUserIds = normalizeUserIds(userIds);
    int safeUserLimit = clamp(userLimit, 1, MAX_USER_LIMIT);
    int safeRecentLimit = clamp(recentLimit, 10, MAX_RECENT_LIMIT);
    int safeDays = clamp(days, 3, MAX_DAYS);

    AdminInsightsResponse.Filter filter =
        new AdminInsightsResponse.Filter(
            safeUserIds, chapterCode, nodeCode, safeUserLimit, safeRecentLimit, safeDays);

    AdminInsightsResponse.Summary summary = loadInsightsSummary(safeUserIds);
    List<AdminInsightsResponse.ChapterStat> chapterStats = loadInsightsChapterStats(safeUserIds);
    List<AdminInsightsResponse.DailyActivity> dailyActivities =
        loadDailyActivities(safeUserIds, safeDays);
    List<AdminInsightsResponse.RevisitRankingItem> revisitRanking =
        loadRevisitRanking(safeUserIds, Math.min(safeUserLimit, 100));
    List<AdminInsightsResponse.NodeBottleneck> nodeBottlenecks =
        loadNodeBottlenecks(safeUserIds, chapterCode, nodeCode, 40);
    List<AdminInsightsResponse.UserInsight> userInsights =
        loadUserInsights(safeUserIds, chapterCode, nodeCode, safeUserLimit, safeRecentLimit);
    AdminInsightsResponse.UserComparison comparison =
        buildUserComparison(safeUserIds, chapterCode, nodeCode, safeRecentLimit);

    return new AdminInsightsResponse(
        filter,
        summary,
        chapterStats,
        dailyActivities,
        revisitRanking,
        nodeBottlenecks,
        userInsights,
        comparison);
  }

  private AdminDashboardResponse.Summary loadDashboardSummary() {
    String sql =
        """
        SELECT
          COUNT(*) AS total_users,
          COUNT(*) FILTER (WHERE role = 'MEMBER') AS member_users,
          COUNT(*) FILTER (WHERE role = 'GUEST') AS guest_users,
          COUNT(*) FILTER (WHERE role = 'ADMIN') AS admin_users,
          COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL '24 hours') AS active_users_24h,
          (SELECT COUNT(*) FROM user_story_progress) AS users_with_story_progress,
          (SELECT COUNT(*) FROM user_chapter_progress WHERE completed_at IS NOT NULL) AS completed_chapter_events,
          COALESCE((
            SELECT AVG(EXTRACT(EPOCH FROM (completed_at - unlocked_at)) / 3600.0)
            FROM user_chapter_progress
            WHERE completed_at IS NOT NULL
          ), 0) AS avg_hours_to_chapter_complete
        FROM users
        """;

    return jdbcTemplate.queryForObject(
        sql,
        (rs, rowNum) ->
            new AdminDashboardResponse.Summary(
                rs.getLong("total_users"),
                rs.getLong("member_users"),
                rs.getLong("guest_users"),
                rs.getLong("admin_users"),
                rs.getLong("active_users_24h"),
                rs.getLong("users_with_story_progress"),
                rs.getLong("completed_chapter_events"),
                rs.getDouble("avg_hours_to_chapter_complete")));
  }

  private List<AdminDashboardResponse.ChapterStat> loadDashboardChapterStats() {
    String sql =
        """
        SELECT
          c.id AS chapter_id,
          c.code AS chapter_code,
          c.title AS chapter_title,
          COUNT(ucp.id) FILTER (WHERE ucp.status IN ('UNLOCKED', 'COMPLETED')) AS unlocked_users,
          COUNT(ucp.id) FILTER (WHERE ucp.status = 'COMPLETED') AS completed_users,
          COALESCE(
            ROUND(
              (
                COUNT(ucp.id) FILTER (WHERE ucp.status = 'COMPLETED')::numeric
                / NULLIF(COUNT(ucp.id) FILTER (WHERE ucp.status IN ('UNLOCKED', 'COMPLETED')), 0)
              ) * 100, 2
            ),
            0
          ) AS completion_rate_percent
        FROM chapters c
        LEFT JOIN user_chapter_progress ucp ON ucp.chapter_id = c.id
        GROUP BY c.id, c.code, c.title, c.sort_order
        ORDER BY c.sort_order
        """;

    return jdbcTemplate.query(
        sql,
        (rs, rowNum) ->
            new AdminDashboardResponse.ChapterStat(
                rs.getLong("chapter_id"),
                rs.getString("chapter_code"),
                rs.getString("chapter_title"),
                rs.getLong("unlocked_users"),
                rs.getLong("completed_users"),
                rs.getDouble("completion_rate_percent")));
  }

  private List<AdminDashboardResponse.UserProgress> loadDashboardUsers(int limit) {
    String sql =
        """
        SELECT
          u.id AS user_id,
          u.email,
          u.nickname,
          u.role,
          c.code AS latest_chapter_code,
          sn.code AS latest_node_code,
          COALESCE(cc.completed_count, 0) AS completed_chapter_count,
          usp.updated_at AS last_progress_at,
          u.last_login_at
        FROM users u
        LEFT JOIN user_story_progress usp ON usp.user_id = u.id
        LEFT JOIN chapters c ON c.id = usp.latest_chapter_id
        LEFT JOIN story_nodes sn ON sn.id = usp.latest_node_id
        LEFT JOIN (
          SELECT user_id, COUNT(*) AS completed_count
          FROM user_chapter_progress
          WHERE status = 'COMPLETED'
          GROUP BY user_id
        ) cc ON cc.user_id = u.id
        ORDER BY u.id DESC
        LIMIT ?
        """;

    return jdbcTemplate.query(sql, this::mapDashboardUserProgress, limit);
  }

  private AdminDashboardResponse.UserProgress mapDashboardUserProgress(ResultSet rs, int rowNum)
      throws SQLException {
    return new AdminDashboardResponse.UserProgress(
        rs.getLong("user_id"),
        rs.getString("email"),
        rs.getString("nickname"),
        rs.getString("role"),
        rs.getString("latest_chapter_code"),
        rs.getString("latest_node_code"),
        rs.getLong("completed_chapter_count"),
        formatTs(rs.getTimestamp("last_progress_at")),
        formatTs(rs.getTimestamp("last_login_at")));
  }

  private AdminInsightsResponse.Summary loadInsightsSummary(List<Long> userIds) {
    StringBuilder sql =
        new StringBuilder(
            """
            SELECT
              COUNT(*) AS total_users,
              COUNT(*) FILTER (WHERE role = 'MEMBER') AS member_users,
              COUNT(*) FILTER (WHERE role = 'GUEST') AS guest_users,
              COUNT(*) FILTER (WHERE role = 'ADMIN') AS admin_users,
              COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL '24 hours') AS active_users_24h,
              COALESCE((
                SELECT COUNT(*)
                FROM user_story_progress usp
                WHERE 1=1
            """);

    List<Object> params = new ArrayList<>();
    if (!userIds.isEmpty()) {
      sql.append(" AND usp.user_id IN (").append(placeholders(userIds.size())).append(")");
      params.addAll(userIds);
    }
    sql.append("), 0) AS users_with_story_progress,");
    sql.append(
        """
              COALESCE((
                SELECT COUNT(*)
                FROM user_chapter_progress ucp
                WHERE ucp.completed_at IS NOT NULL
            """);
    if (!userIds.isEmpty()) {
      sql.append(" AND ucp.user_id IN (").append(placeholders(userIds.size())).append(")");
      params.addAll(userIds);
    }
    sql.append("), 0) AS completed_chapter_events,");
    sql.append(
        """
              COALESCE((
                SELECT AVG(EXTRACT(EPOCH FROM (ucp.completed_at - ucp.unlocked_at)) / 3600.0)
                FROM user_chapter_progress ucp
                WHERE ucp.completed_at IS NOT NULL
            """);
    if (!userIds.isEmpty()) {
      sql.append(" AND ucp.user_id IN (").append(placeholders(userIds.size())).append(")");
      params.addAll(userIds);
    }
    sql.append(
        """
              ), 0) AS avg_hours_to_chapter_complete
            FROM users u
            WHERE 1=1
            """);

    if (!userIds.isEmpty()) {
      sql.append(" AND u.id IN (").append(placeholders(userIds.size())).append(")");
      params.addAll(userIds);
    }

    return jdbcTemplate.queryForObject(
        sql.toString(),
        params.toArray(),
        (rs, rowNum) ->
            new AdminInsightsResponse.Summary(
                rs.getLong("total_users"),
                rs.getLong("member_users"),
                rs.getLong("guest_users"),
                rs.getLong("admin_users"),
                rs.getLong("active_users_24h"),
                rs.getLong("users_with_story_progress"),
                rs.getLong("completed_chapter_events"),
                rs.getDouble("avg_hours_to_chapter_complete")));
  }

  private List<AdminInsightsResponse.ChapterStat> loadInsightsChapterStats(List<Long> userIds) {
    StringBuilder sql =
        new StringBuilder(
            """
            SELECT
              c.id AS chapter_id,
              c.code AS chapter_code,
              c.title AS chapter_title,
              COUNT(ucp.id) FILTER (WHERE ucp.status IN ('UNLOCKED', 'COMPLETED')) AS unlocked_users,
              COUNT(ucp.id) FILTER (WHERE ucp.status = 'COMPLETED') AS completed_users,
              COALESCE(
                ROUND(
                  (
                    COUNT(ucp.id) FILTER (WHERE ucp.status = 'COMPLETED')::numeric
                    / NULLIF(COUNT(ucp.id) FILTER (WHERE ucp.status IN ('UNLOCKED', 'COMPLETED')), 0)
                  ) * 100, 2
                ),
                0
              ) AS completion_rate_percent
            FROM chapters c
            LEFT JOIN user_chapter_progress ucp ON ucp.chapter_id = c.id
            """);

    List<Object> params = new ArrayList<>();
    if (!userIds.isEmpty()) {
      sql.append(" AND ucp.user_id IN (").append(placeholders(userIds.size())).append(")");
      params.addAll(userIds);
    }

    sql.append(" GROUP BY c.id, c.code, c.title, c.sort_order ORDER BY c.sort_order");

    return jdbcTemplate.query(
        sql.toString(),
        params.toArray(),
        (rs, rowNum) ->
            new AdminInsightsResponse.ChapterStat(
                rs.getLong("chapter_id"),
                rs.getString("chapter_code"),
                rs.getString("chapter_title"),
                rs.getLong("unlocked_users"),
                rs.getLong("completed_users"),
                rs.getDouble("completion_rate_percent")));
  }

  private List<AdminInsightsResponse.DailyActivity> loadDailyActivities(
      List<Long> userIds, int days) {
    LocalDate today = LocalDate.now();
    LocalDate start = today.minusDays(days - 1L);

    Map<LocalDate, DailyCounter> counters = new LinkedHashMap<>();
    LocalDate cursor = start;
    while (!cursor.isAfter(today)) {
      counters.put(cursor, new DailyCounter());
      cursor = cursor.plusDays(1);
    }

    mergeDailyCounts(
        counters,
        "SELECT last_login_at::date AS day, COUNT(*) AS cnt FROM users WHERE last_login_at IS NOT NULL AND last_login_at::date >= ?",
        "id",
        userIds,
        start,
        DailyCounter::setLoginUsers);

    mergeDailyCounts(
        counters,
        "SELECT updated_at::date AS day, COUNT(*) AS cnt FROM user_story_progress WHERE updated_at::date >= ?",
        "user_id",
        userIds,
        start,
        DailyCounter::setProgressedUsers);

    mergeDailyCounts(
        counters,
        "SELECT completed_at::date AS day, COUNT(*) AS cnt FROM user_chapter_progress WHERE completed_at IS NOT NULL AND completed_at::date >= ?",
        "user_id",
        userIds,
        start,
        DailyCounter::setCompletedEvents);

    List<AdminInsightsResponse.DailyActivity> rows = new ArrayList<>();
    for (Map.Entry<LocalDate, DailyCounter> entry : counters.entrySet()) {
      DailyCounter c = entry.getValue();
      rows.add(
          new AdminInsightsResponse.DailyActivity(
              entry.getKey().format(DAY_FMT), c.loginUsers, c.progressedUsers, c.completedEvents));
    }
    return rows;
  }

  private void mergeDailyCounts(
      Map<LocalDate, DailyCounter> counters,
      String baseSql,
      String userIdColumn,
      List<Long> userIds,
      LocalDate start,
      DailySetter setter) {
    StringBuilder sql = new StringBuilder(baseSql);
    List<Object> params = new ArrayList<>();
    params.add(java.sql.Date.valueOf(start));

    if (!userIds.isEmpty()) {
      sql.append(" AND ")
          .append(userIdColumn)
          .append(" IN (")
          .append(placeholders(userIds.size()))
          .append(")");
      params.addAll(userIds);
    }
    sql.append(" GROUP BY day");

    jdbcTemplate.query(
        sql.toString(),
        params.toArray(),
        rs -> {
          LocalDate day = rs.getDate("day").toLocalDate();
          long cnt = rs.getLong("cnt");
          DailyCounter counter = counters.get(day);
          if (counter != null) {
            setter.accept(counter, cnt);
          }
        });
  }

  private List<AdminInsightsResponse.RevisitRankingItem> loadRevisitRanking(
      List<Long> userIds, int limit) {
    List<Object> params = new ArrayList<>();
    StringBuilder sql =
        new StringBuilder(
            """
            WITH per_user_dates AS (
              SELECT u.id AS user_id, d.event_day
              FROM users u
              LEFT JOIN LATERAL (
                SELECT u.created_at::date AS event_day
                UNION
                SELECT u.last_login_at::date
                UNION
                SELECT usp.updated_at::date
                  FROM user_story_progress usp
                 WHERE usp.user_id = u.id
                UNION
                SELECT ucp.unlocked_at::date
                  FROM user_chapter_progress ucp
                 WHERE ucp.user_id = u.id
                UNION
                SELECT ucp.completed_at::date
                  FROM user_chapter_progress ucp
                 WHERE ucp.user_id = u.id
                   AND ucp.completed_at IS NOT NULL
              ) d ON true
              WHERE d.event_day IS NOT NULL
            """);

    if (!userIds.isEmpty()) {
      sql.append(" AND u.id IN (").append(placeholders(userIds.size())).append(")");
      params.addAll(userIds);
    }

    sql.append(
        """
            ),
            agg AS (
              SELECT user_id,
                     COUNT(DISTINCT event_day) AS active_days,
                     MIN(event_day) AS min_day,
                     MAX(event_day) AS max_day
              FROM per_user_dates
              GROUP BY user_id
            ),
            completed AS (
              SELECT user_id, COUNT(*) AS completed_chapter_count
              FROM user_chapter_progress
              WHERE status = 'COMPLETED'
              GROUP BY user_id
            )
            SELECT
              u.id AS user_id,
              u.email,
              u.nickname,
              u.role,
              COALESCE(agg.active_days, 1) AS active_days,
              CASE
                WHEN agg.min_day IS NULL OR agg.max_day IS NULL THEN 1
                ELSE (agg.max_day - agg.min_day + 1)
              END AS span_days,
              CASE
                WHEN agg.min_day IS NULL OR agg.max_day IS NULL OR (agg.max_day - agg.min_day + 1) <= 1 THEN 0
                ELSE ROUND(((COALESCE(agg.active_days, 1) - 1)::numeric / NULLIF((agg.max_day - agg.min_day), 0)) * 100, 2)
              END AS revisit_rate_percent,
              COALESCE(completed.completed_chapter_count, 0) AS completed_chapter_count,
              u.last_login_at
            FROM users u
            LEFT JOIN agg ON agg.user_id = u.id
            LEFT JOIN completed ON completed.user_id = u.id
            WHERE 1=1
            """);

    if (!userIds.isEmpty()) {
      sql.append(" AND u.id IN (").append(placeholders(userIds.size())).append(")");
      params.addAll(userIds);
    }

    sql.append(
        """
            ORDER BY revisit_rate_percent DESC, active_days DESC, u.id ASC
            LIMIT ?
            """);
    params.add(limit);

    return jdbcTemplate.query(
        sql.toString(),
        params.toArray(),
        (rs, rowNum) ->
            new AdminInsightsResponse.RevisitRankingItem(
                rs.getLong("user_id"),
                rs.getString("email"),
                rs.getString("nickname"),
                rs.getString("role"),
                rs.getInt("active_days"),
                rs.getInt("span_days"),
                rs.getDouble("revisit_rate_percent"),
                rs.getLong("completed_chapter_count"),
                formatTs(rs.getTimestamp("last_login_at"))));
  }

  private Map<Long, RevisitMetric> loadRevisitMetricMap(List<Long> userIds) {
    if (userIds.isEmpty()) {
      return Map.of();
    }

    List<AdminInsightsResponse.RevisitRankingItem> ranking =
        loadRevisitRanking(userIds, Math.max(userIds.size(), 10));

    Map<Long, RevisitMetric> map = new HashMap<>();
    for (AdminInsightsResponse.RevisitRankingItem item : ranking) {
      map.put(
          item.userId(),
          new RevisitMetric(item.activeDays(), item.spanDays(), item.revisitRatePercent()));
    }
    return map;
  }

  private List<AdminInsightsResponse.NodeBottleneck> loadNodeBottlenecks(
      List<Long> userIds, String chapterCode, String nodeCode, int limit) {
    StringBuilder sql =
        new StringBuilder(
            """
            SELECT
              c.code AS chapter_code,
              sn.code AS node_code,
              COUNT(*) AS users_at_node
            FROM user_story_progress usp
            JOIN chapters c ON c.id = usp.latest_chapter_id
            JOIN story_nodes sn ON sn.id = usp.latest_node_id
            WHERE 1=1
            """);

    List<Object> params = new ArrayList<>();
    if (!userIds.isEmpty()) {
      sql.append(" AND usp.user_id IN (").append(placeholders(userIds.size())).append(")");
      params.addAll(userIds);
    }
    if (chapterCode != null) {
      sql.append(" AND c.code = ?");
      params.add(chapterCode);
    }
    if (nodeCode != null) {
      sql.append(" AND sn.code = ?");
      params.add(nodeCode);
    }

    sql.append(" GROUP BY c.code, sn.code ORDER BY users_at_node DESC, sn.code ASC LIMIT ?");
    params.add(limit);

    return jdbcTemplate.query(
        sql.toString(),
        params.toArray(),
        (rs, rowNum) ->
            new AdminInsightsResponse.NodeBottleneck(
                rs.getString("chapter_code"),
                rs.getString("node_code"),
                rs.getLong("users_at_node")));
  }

  private List<AdminInsightsResponse.UserInsight> loadUserInsights(
      List<Long> selectedUserIds,
      String chapterCode,
      String nodeCode,
      int userLimit,
      int recentLimit) {
    StringBuilder sql =
        new StringBuilder(
            """
            SELECT
              u.id AS user_id,
              u.email,
              u.nickname,
              u.role,
              c.code AS latest_chapter_code,
              sn.code AS latest_node_code,
              COALESCE(cc.completed_count, 0) AS completed_chapter_count,
              usp.updated_at AS last_progress_at,
              u.last_login_at
            FROM users u
            LEFT JOIN user_story_progress usp ON usp.user_id = u.id
            LEFT JOIN chapters c ON c.id = usp.latest_chapter_id
            LEFT JOIN story_nodes sn ON sn.id = usp.latest_node_id
            LEFT JOIN (
              SELECT user_id, COUNT(*) AS completed_count
              FROM user_chapter_progress
              WHERE status = 'COMPLETED'
              GROUP BY user_id
            ) cc ON cc.user_id = u.id
            WHERE 1=1
            """);

    List<Object> params = new ArrayList<>();
    if (!selectedUserIds.isEmpty()) {
      sql.append(" AND u.id IN (").append(placeholders(selectedUserIds.size())).append(")");
      params.addAll(selectedUserIds);
    }
    if (chapterCode != null) {
      sql.append(" AND c.code = ?");
      params.add(chapterCode);
    }
    if (nodeCode != null) {
      sql.append(" AND sn.code = ?");
      params.add(nodeCode);
    }

    sql.append(" ORDER BY u.id DESC LIMIT ?");
    params.add(userLimit);

    List<AdminInsightsResponse.UserInsight> rows =
        jdbcTemplate.query(
            sql.toString(),
            params.toArray(),
            (rs, rowNum) ->
                new AdminInsightsResponse.UserInsight(
                    rs.getLong("user_id"),
                    rs.getString("email"),
                    rs.getString("nickname"),
                    rs.getString("role"),
                    rs.getString("latest_chapter_code"),
                    rs.getString("latest_node_code"),
                    rs.getLong("completed_chapter_count"),
                    formatTs(rs.getTimestamp("last_progress_at")),
                    formatTs(rs.getTimestamp("last_login_at")),
                    1,
                    1,
                    0,
                    0,
                    List.of(),
                    new AdminInsightsResponse.RecentActionSummary(0, 0, 0, 0, 0, 0, 0, 0),
                    List.of(),
                    List.of()));

    if (rows.isEmpty()) {
      return rows;
    }

    List<Long> userIds = rows.stream().map(AdminInsightsResponse.UserInsight::userId).toList();
    Map<Long, RevisitMetric> revisitMetricMap = loadRevisitMetricMap(userIds);

    List<AdminInsightsResponse.UserInsight> enriched = new ArrayList<>();
    for (AdminInsightsResponse.UserInsight row : rows) {
      RevisitMetric revisit =
          revisitMetricMap.getOrDefault(row.userId(), new RevisitMetric(1, 1, 0));
      List<AdminInsightsResponse.ChapterClearTime> clearTimes =
          loadChapterClearTimes(row.userId(), chapterCode);
      UserRecentStats recentStats =
          loadUserRecentStats(row.userId(), chapterCode, nodeCode, recentLimit);

      enriched.add(
          new AdminInsightsResponse.UserInsight(
              row.userId(),
              row.email(),
              row.nickname(),
              row.role(),
              row.latestChapterCode(),
              row.latestNodeCode(),
              row.completedChapterCount(),
              row.lastProgressAt(),
              row.lastLoginAt(),
              revisit.activeDays(),
              revisit.spanDays(),
              revisit.revisitRatePercent(),
              recentStats.failCount(),
              clearTimes,
              recentStats.summary(),
              recentStats.nodeStats(),
              recentStats.commandStats()));
    }

    return enriched;
  }

  private List<AdminInsightsResponse.ChapterClearTime> loadChapterClearTimes(
      Long userId, String chapterCode) {
    StringBuilder sql =
        new StringBuilder(
            """
            SELECT
              c.code AS chapter_code,
              ucp.unlocked_at,
              ucp.completed_at,
              ROUND(EXTRACT(EPOCH FROM (ucp.completed_at - ucp.unlocked_at)) / 3600.0, 2) AS hours_to_complete
            FROM user_chapter_progress ucp
            JOIN chapters c ON c.id = ucp.chapter_id
            WHERE ucp.user_id = ?
              AND ucp.completed_at IS NOT NULL
            """);

    List<Object> params = new ArrayList<>();
    params.add(userId);
    if (chapterCode != null) {
      sql.append(" AND c.code = ?");
      params.add(chapterCode);
    }
    sql.append(" ORDER BY ucp.unlocked_at ASC");

    return jdbcTemplate.query(
        sql.toString(),
        params.toArray(),
        (rs, rowNum) ->
            new AdminInsightsResponse.ChapterClearTime(
                rs.getString("chapter_code"),
                formatTs(rs.getTimestamp("unlocked_at")),
                formatTs(rs.getTimestamp("completed_at")),
                rs.getDouble("hours_to_complete")));
  }

  private UserRecentStats loadUserRecentStats(
      Long userId, String chapterCode, String nodeCode, int recentLimit) {
    String sessionId = "sess_user_" + userId;
    List<StoryRecentEvent> events =
        storySessionRedisService.getRecentEvents(sessionId, recentLimit);
    Map<Object, Object> state = storySessionRedisService.getSessionState(sessionId);
    String sessionChapter = stringOrNull(state.get("chapter_id"));

    ActionAccumulator accumulator = new ActionAccumulator();

    for (StoryRecentEvent event : events) {
      String eventChapter = blankToNull(event.chapterCode());
      if (eventChapter == null) {
        eventChapter = sessionChapter;
      }
      if (chapterCode != null && (eventChapter == null || !chapterCode.equals(eventChapter))) {
        continue;
      }

      String node = resolveNodeCode(event);
      if (nodeCode != null && (node == null || !nodeCode.equals(node))) {
        continue;
      }
      accumulator.accept(event, node);
    }

    return new UserRecentStats(
        accumulator.toSummary(),
        accumulator.toNodeStats(),
        accumulator.toCommandStats(),
        storySessionRedisService.getFailCount(sessionId));
  }

  private AdminInsightsResponse.UserComparison buildUserComparison(
      List<Long> selectedUserIds, String chapterCode, String nodeCode, int recentLimit) {
    if (selectedUserIds.size() != 2) {
      return new AdminInsightsResponse.UserComparison(
          false,
          chapterCode,
          nodeCode,
          null,
          null,
          new AdminInsightsResponse.RecentActionSummary(0, 0, 0, 0, 0, 0, 0, 0),
          new AdminInsightsResponse.RecentActionSummary(0, 0, 0, 0, 0, 0, 0, 0),
          List.of(),
          List.of());
    }

    Long leftUserId = selectedUserIds.get(0);
    Long rightUserId = selectedUserIds.get(1);

    UserRecentStats left = loadUserRecentStats(leftUserId, chapterCode, nodeCode, recentLimit);
    UserRecentStats right = loadUserRecentStats(rightUserId, chapterCode, nodeCode, recentLimit);

    Map<String, AdminInsightsResponse.NodeActionStat> leftNodeMap =
        left.nodeStats().stream()
            .collect(Collectors.toMap(AdminInsightsResponse.NodeActionStat::nodeCode, s -> s));
    Map<String, AdminInsightsResponse.NodeActionStat> rightNodeMap =
        right.nodeStats().stream()
            .collect(Collectors.toMap(AdminInsightsResponse.NodeActionStat::nodeCode, s -> s));

    Set<String> nodeCodes = new HashSet<>();
    nodeCodes.addAll(leftNodeMap.keySet());
    nodeCodes.addAll(rightNodeMap.keySet());

    List<AdminInsightsResponse.NodeComparisonRow> nodeComparison = new ArrayList<>();
    for (String code : nodeCodes) {
      AdminInsightsResponse.NodeActionStat l = leftNodeMap.get(code);
      AdminInsightsResponse.NodeActionStat r = rightNodeMap.get(code);
      nodeComparison.add(
          new AdminInsightsResponse.NodeComparisonRow(
              code,
              l != null ? l.totalCount() : 0,
              l != null ? l.successCount() : 0,
              l != null ? l.failCount() : 0,
              l != null ? l.errorCount() : 0,
              r != null ? r.totalCount() : 0,
              r != null ? r.successCount() : 0,
              r != null ? r.failCount() : 0,
              r != null ? r.errorCount() : 0));
    }
    nodeComparison.sort(
        (a, b) ->
            Integer.compare((b.leftTotal() + b.rightTotal()), (a.leftTotal() + a.rightTotal())));

    Map<String, AdminInsightsResponse.CommandActionStat> leftCmdMap =
        left.commandStats().stream()
            .collect(Collectors.toMap(AdminInsightsResponse.CommandActionStat::command, c -> c));
    Map<String, AdminInsightsResponse.CommandActionStat> rightCmdMap =
        right.commandStats().stream()
            .collect(Collectors.toMap(AdminInsightsResponse.CommandActionStat::command, c -> c));

    Set<String> commands = new HashSet<>();
    commands.addAll(leftCmdMap.keySet());
    commands.addAll(rightCmdMap.keySet());

    List<AdminInsightsResponse.CommandComparisonRow> commandComparison = new ArrayList<>();
    for (String command : commands) {
      AdminInsightsResponse.CommandActionStat l = leftCmdMap.get(command);
      AdminInsightsResponse.CommandActionStat r = rightCmdMap.get(command);
      commandComparison.add(
          new AdminInsightsResponse.CommandComparisonRow(
              command,
              l != null ? l.totalCount() : 0,
              l != null ? l.successCount() : 0,
              l != null ? l.failCount() : 0,
              l != null ? l.errorCount() : 0,
              r != null ? r.totalCount() : 0,
              r != null ? r.successCount() : 0,
              r != null ? r.failCount() : 0,
              r != null ? r.errorCount() : 0));
    }
    commandComparison.sort(
        (a, b) ->
            Integer.compare((b.leftTotal() + b.rightTotal()), (a.leftTotal() + a.rightTotal())));

    return new AdminInsightsResponse.UserComparison(
        true,
        chapterCode,
        nodeCode,
        leftUserId,
        rightUserId,
        left.summary(),
        right.summary(),
        nodeComparison,
        commandComparison);
  }

  private String resolveNodeCode(StoryRecentEvent event) {
    String toNode = blankToNull(event.toNodeId());
    if (toNode != null) {
      return toNode;
    }
    return blankToNull(event.fromNodeId());
  }

  private String blankToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private String stringOrNull(Object value) {
    if (value == null) {
      return null;
    }
    String text = String.valueOf(value).trim();
    return text.isEmpty() ? null : text;
  }

  private int clamp(int value, int min, int max) {
    return Math.max(min, Math.min(max, value));
  }

  private List<Long> normalizeUserIds(List<Long> userIds) {
    if (userIds == null || userIds.isEmpty()) {
      return List.of();
    }
    return userIds.stream()
        .filter(id -> id != null && id > 0)
        .distinct()
        .collect(Collectors.toList());
  }

  private String placeholders(int count) {
    return String.join(",", Collections.nCopies(count, "?"));
  }

  private String formatTs(Timestamp timestamp) {
    if (timestamp == null) return null;
    LocalDateTime ldt = timestamp.toLocalDateTime();
    return ldt.format(TS_FMT);
  }

  private record RevisitMetric(int activeDays, int spanDays, double revisitRatePercent) {}

  private interface DailySetter {
    void accept(DailyCounter counter, long value);
  }

  private static class DailyCounter {
    private long loginUsers;
    private long progressedUsers;
    private long completedEvents;

    void setLoginUsers(long value) {
      this.loginUsers = value;
    }

    void setProgressedUsers(long value) {
      this.progressedUsers = value;
    }

    void setCompletedEvents(long value) {
      this.completedEvents = value;
    }
  }

  private static class ActionAccumulator {
    private int total;
    private int success;
    private int fail;
    private int error;
    private int command;
    private int inspect;
    private int click;
    private int hintRequested;

    private final Map<String, NodeCounter> nodeCounters = new HashMap<>();
    private final Map<String, CommandCounter> commandCounters = new HashMap<>();

    void accept(StoryRecentEvent event, String nodeCode) {
      total++;

      String result = normalize(event.result());
      if ("SUCCESS".equals(result)) success++;
      if ("FAIL".equals(result)) fail++;
      if ("ERROR".equals(result)) error++;

      String actionType = normalize(event.actionType());
      if ("COMMAND".equals(actionType)) command++;
      if ("INSPECT".equals(actionType)) inspect++;
      if ("CLICK".equals(actionType)) click++;

      if (event.hintRequested()) {
        hintRequested++;
      }

      String keyNode = nodeCode != null ? nodeCode : "UNKNOWN";
      NodeCounter nodeCounter = nodeCounters.computeIfAbsent(keyNode, n -> new NodeCounter());
      nodeCounter.total++;
      if ("SUCCESS".equals(result)) nodeCounter.success++;
      if ("FAIL".equals(result)) nodeCounter.fail++;
      if ("ERROR".equals(result)) nodeCounter.error++;
      if ("COMMAND".equals(actionType)) nodeCounter.command++;
      if ("INSPECT".equals(actionType)) nodeCounter.inspect++;
      if ("CLICK".equals(actionType)) nodeCounter.click++;

      if ("COMMAND".equals(actionType)) {
        String commandValue = normalizeCommand(event.inputValueNorm(), event.inputValue());
        if (commandValue != null) {
          nodeCounter.uniqueCommands.add(commandValue);
          CommandCounter cmdCounter =
              commandCounters.computeIfAbsent(commandValue, c -> new CommandCounter());
          cmdCounter.total++;
          if ("SUCCESS".equals(result)) cmdCounter.success++;
          if ("FAIL".equals(result)) cmdCounter.fail++;
          if ("ERROR".equals(result)) cmdCounter.error++;
        }
      }
    }

    AdminInsightsResponse.RecentActionSummary toSummary() {
      return new AdminInsightsResponse.RecentActionSummary(
          total, success, fail, error, command, inspect, click, hintRequested);
    }

    List<AdminInsightsResponse.NodeActionStat> toNodeStats() {
      List<AdminInsightsResponse.NodeActionStat> rows = new ArrayList<>();
      for (Map.Entry<String, NodeCounter> entry : nodeCounters.entrySet()) {
        NodeCounter n = entry.getValue();
        rows.add(
            new AdminInsightsResponse.NodeActionStat(
                entry.getKey(),
                n.total,
                n.success,
                n.fail,
                n.error,
                n.command,
                n.inspect,
                n.click,
                n.uniqueCommands.size()));
      }
      rows.sort(
          (a, b) -> {
            int byTotal = Integer.compare(b.totalCount(), a.totalCount());
            if (byTotal != 0) return byTotal;
            return a.nodeCode().compareToIgnoreCase(b.nodeCode());
          });
      return rows;
    }

    List<AdminInsightsResponse.CommandActionStat> toCommandStats() {
      List<AdminInsightsResponse.CommandActionStat> rows = new ArrayList<>();
      for (Map.Entry<String, CommandCounter> entry : commandCounters.entrySet()) {
        CommandCounter c = entry.getValue();
        rows.add(
            new AdminInsightsResponse.CommandActionStat(
                entry.getKey(), c.total, c.success, c.fail, c.error));
      }
      rows.sort(
          (a, b) -> {
            int byTotal = Integer.compare(b.totalCount(), a.totalCount());
            if (byTotal != 0) return byTotal;
            return a.command().compareToIgnoreCase(b.command());
          });
      return rows;
    }

    private String normalize(String value) {
      if (value == null) return "";
      return value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeCommand(String normalizedInput, String rawInput) {
      String base = blankToNullLocal(normalizedInput);
      if (base == null) {
        base = blankToNullLocal(rawInput);
      }
      if (base == null) {
        return null;
      }
      return base.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private String blankToNullLocal(String value) {
      if (value == null) return null;
      String trimmed = value.trim();
      return trimmed.isEmpty() ? null : trimmed;
    }
  }

  private static class NodeCounter {
    private int total;
    private int success;
    private int fail;
    private int error;
    private int command;
    private int inspect;
    private int click;
    private final Set<String> uniqueCommands = new HashSet<>();
  }

  private static class CommandCounter {
    private int total;
    private int success;
    private int fail;
    private int error;
  }

  private record UserRecentStats(
      AdminInsightsResponse.RecentActionSummary summary,
      List<AdminInsightsResponse.NodeActionStat> nodeStats,
      List<AdminInsightsResponse.CommandActionStat> commandStats,
      int failCount) {}
}
