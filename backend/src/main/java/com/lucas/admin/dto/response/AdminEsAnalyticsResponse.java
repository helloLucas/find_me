package com.lucas.admin.dto.response;

import java.util.List;

public record AdminEsAnalyticsResponse(
    Filter filter,
    Source source,
    Overview overview,
    List<TimelineRow> timeline,
    List<NodeBottleneck> bottlenecks,
    List<FailCommand> failCommands,
    List<UserJourney> userJourneys,
    UserComparison comparison) {

  public record Filter(
      String from,
      String to,
      String timezone,
      List<Long> userIds,
      String chapterCode,
      String nodeCode,
      int topN) {}

  public record Source(
      boolean esEnabled,
      boolean esReachable,
      boolean fallbackUsed,
      String indexPattern,
      String message) {}

  public record Overview(
      long totalEvents,
      long successCount,
      long failCount,
      long errorCount,
      long hintRequestedCount,
      long uniqueUsers,
      long uniqueSessions,
      long commandCount,
      long inspectCount,
      long clickCount) {}

  public record TimelineRow(
      String date,
      long totalCount,
      long successCount,
      long failCount,
      long errorCount,
      long hintRequestedCount,
      long uniqueUsers) {}

  public record NodeBottleneck(
      String chapterCode,
      String nodeCode,
      long totalCount,
      long failCount,
      long errorCount,
      double failRatePercent) {}

  public record FailCommand(
      String command, long totalCount, long failCount, long errorCount, long uniqueUsers) {}

  public record UserOption(Long userId, String email, String nickname, String role) {}

  public record UserJourney(
      UserOption user,
      UserSummary summary,
      List<UserNodeStat> nodeStats,
      List<UserCommandStat> commandStats,
      List<UserNodeActionSummary> nodeActionSummaries) {}

  public record UserSummary(
      long totalCount,
      long successCount,
      long failCount,
      long errorCount,
      long hintRequestedCount,
      long uniqueSessions,
      String latestActionAt) {}

  public record UserNodeStat(
      String nodeCode, long totalCount, long successCount, long failCount, long errorCount) {}

  public record UserCommandStat(
      String command, long totalCount, long successCount, long failCount, long errorCount) {}

  public record UserNodeActionSummary(
      String nodeCode,
      long totalCount,
      long successCount,
      long failCount,
      long errorCount,
      List<UserNodeActionItem> topActions) {}

  public record UserNodeActionItem(
      String actionType,
      String inputValue,
      long totalCount,
      long successCount,
      long failCount,
      long errorCount) {}

  public record UserComparison(
      boolean enabled,
      Long leftUserId,
      Long rightUserId,
      UserSummary leftSummary,
      UserSummary rightSummary,
      List<UserNodeComparisonRow> nodeRows,
      List<UserCommandComparisonRow> commandRows) {}

  public record UserNodeComparisonRow(
      String nodeCode,
      long leftTotal,
      long leftSuccess,
      long leftFail,
      long leftError,
      long rightTotal,
      long rightSuccess,
      long rightFail,
      long rightError) {}

  public record UserCommandComparisonRow(
      String command,
      long leftTotal,
      long leftSuccess,
      long leftFail,
      long leftError,
      long rightTotal,
      long rightSuccess,
      long rightFail,
      long rightError) {}
}
