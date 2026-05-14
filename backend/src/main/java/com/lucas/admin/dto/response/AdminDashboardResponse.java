package com.lucas.admin.dto.response;

import java.util.List;

public record AdminDashboardResponse(
    Summary summary, List<ChapterStat> chapterStats, List<UserProgress> users) {

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

  public record UserProgress(
      Long userId,
      String email,
      String nickname,
      String role,
      String latestChapterCode,
      String latestNodeCode,
      long completedChapterCount,
      String lastProgressAt,
      String lastLoginAt) {}
}
