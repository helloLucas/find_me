package com.lucas.admin.service;

import com.lucas.admin.dto.response.AdminEsAnalyticsResponse;
import com.lucas.admin.dto.response.AdminFilterOptionsResponse;
import java.util.List;

public interface AdminAnalyticsService {

  AdminEsAnalyticsResponse getEsInsights(
      String from,
      String to,
      String timezone,
      List<Long> userIds,
      String chapterCode,
      String nodeCode,
      int topN);

  List<AdminEsAnalyticsResponse.UserOption> searchUsers(String keyword, int limit);

  AdminFilterOptionsResponse getFilterOptions(String chapterCode);
}
