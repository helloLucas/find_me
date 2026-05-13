package com.lucas.admin.service;

import com.lucas.admin.dto.response.AdminDashboardResponse;
import com.lucas.admin.dto.response.AdminInsightsResponse;
import java.util.List;

public interface AdminDashboardService {
  AdminDashboardResponse getDashboard(int userLimit);

  AdminInsightsResponse getInsights(
      List<Long> userIds, String chapterCode, String nodeCode, int userLimit, int recentLimit, int days);
}
