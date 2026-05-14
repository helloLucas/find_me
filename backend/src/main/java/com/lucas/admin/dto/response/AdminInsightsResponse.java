package com.lucas.admin.dto.response;

import java.util.List;

public record AdminInsightsResponse(
    Filter filter,
    Summary summary,
    List<ChapterStat> chapterStats,
    List<DailyActivity> dailyActivities,
    List<RevisitRankingItem> revisitRanking,
    List<NodeBottleneck> nodeBottlenecks,
    List<UserInsight> users,
    UserComparison comparison) {

  public record Filter(
      List<Long> userIds,
      String chapterCode,
      String nodeCode,
      int userLimit,
      int recentLimit,
      int days) {}

  public record Summary(
      long totalUsers,
      long memberUsers,
      long guestUsers,
      long adminUsers,
      long activeUsers24h,
      long usersWithStoryProgress,
      long completedChapterEvents,
      double avgHoursToChapterComplete) {}

  public record ChapterStat(
      Long chapterId,
      String chapterCode,
      String chapterTitle,
      long unlockedUsers,
      long completedUsers,
      double completionRatePercent) {}

  public record DailyActivity(
      String date, long loginUsers, long progressedUsers, long completedChapterEvents) {}

  public record RevisitRankingItem(
      Long userId,
      String email,
      String nickname,
      String role,
      int activeDays,
      int spanDays,
      double revisitRatePercent,
      long completedChapterCount,
      String lastLoginAt) {}

  public record NodeBottleneck(String chapterCode, String nodeCode, long usersAtNode) {}

  public record UserInsight(
      Long userId,
      String email,
      String nickname,
      String role,
      String latestChapterCode,
      String latestNodeCode,
      long completedChapterCount,
      String lastProgressAt,
      String lastLoginAt,
      int activeDays,
      int spanDays,
      double revisitRatePercent,
      int recentFailCount,
      List<ChapterClearTime> chapterClearTimes,
      RecentActionSummary recentActionSummary,
      List<NodeActionStat> nodeActionStats,
      List<CommandActionStat> commandActionStats) {}

  public record ChapterClearTime(
      String chapterCode, String unlockedAt, String completedAt, double hoursToComplete) {}

  public record RecentActionSummary(
      int totalEvents,
      int successCount,
      int failCount,
      int errorCount,
      int commandCount,
      int inspectCount,
      int clickCount,
      int hintRequestedCount) {}

  public record NodeActionStat(
      String nodeCode,
      int totalCount,
      int successCount,
      int failCount,
      int errorCount,
      int commandCount,
      int inspectCount,
      int clickCount,
      int uniqueCommandCount) {}

  public record CommandActionStat(
      String command, int totalCount, int successCount, int failCount, int errorCount) {}

  public record UserComparison(
      boolean enabled,
      String chapterCode,
      String nodeCode,
      Long leftUserId,
      Long rightUserId,
      RecentActionSummary leftSummary,
      RecentActionSummary rightSummary,
      List<NodeComparisonRow> nodeComparison,
      List<CommandComparisonRow> commandComparison) {}

  public record NodeComparisonRow(
      String nodeCode,
      int leftTotal,
      int leftSuccess,
      int leftFail,
      int leftError,
      int rightTotal,
      int rightSuccess,
      int rightFail,
      int rightError) {}

  public record CommandComparisonRow(
      String command,
      int leftTotal,
      int leftSuccess,
      int leftFail,
      int leftError,
      int rightTotal,
      int rightSuccess,
      int rightFail,
      int rightError) {}
}
