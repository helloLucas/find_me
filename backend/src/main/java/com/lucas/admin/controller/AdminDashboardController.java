package com.lucas.admin.controller;

import com.lucas.admin.dto.response.AdminDashboardResponse;
import com.lucas.admin.dto.response.AdminEsAnalyticsResponse;
import com.lucas.admin.dto.response.AdminFilterOptionsResponse;
import com.lucas.admin.dto.response.AdminInsightsResponse;
import com.lucas.admin.service.AdminAnalyticsService;
import com.lucas.admin.service.AdminDashboardService;
import com.lucas.global.dto.BaseResponse;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin")
public class AdminDashboardController {

  private final AdminDashboardService adminDashboardService;
  private final AdminAnalyticsService adminAnalyticsService;

  @GetMapping("/dashboard")
  public ResponseEntity<BaseResponse<AdminDashboardResponse>> getDashboard(
      @RequestParam(name = "limit", defaultValue = "100") int limit) {
    return ResponseEntity.ok(
        BaseResponse.success("관리자 대시보드 조회 성공", adminDashboardService.getDashboard(limit)));
  }

  @GetMapping("/insights")
  public ResponseEntity<BaseResponse<AdminInsightsResponse>> getInsights(
      @RequestParam(name = "userIds", required = false) String userIds,
      @RequestParam(name = "chapterCode", required = false) String chapterCode,
      @RequestParam(name = "nodeCode", required = false) String nodeCode,
      @RequestParam(name = "userLimit", defaultValue = "80") int userLimit,
      @RequestParam(name = "recentLimit", defaultValue = "50") int recentLimit,
      @RequestParam(name = "days", defaultValue = "14") int days) {
    List<Long> parsedUserIds = parseUserIds(userIds);
    AdminInsightsResponse response =
        adminDashboardService.getInsights(
            parsedUserIds, sanitize(chapterCode), sanitize(nodeCode), userLimit, recentLimit, days);
    return ResponseEntity.ok(BaseResponse.success("관리자 인사이트 조회 성공", response));
  }

  @GetMapping("/users/search")
  public ResponseEntity<BaseResponse<List<AdminEsAnalyticsResponse.UserOption>>> searchUsers(
      @RequestParam(name = "q", required = false) String keyword,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {
    List<AdminEsAnalyticsResponse.UserOption> users =
        adminAnalyticsService.searchUsers(sanitize(keyword), limit);
    return ResponseEntity.ok(BaseResponse.success("관리자 유저 검색 성공", users));
  }

  @GetMapping("/filter-options")
  public ResponseEntity<BaseResponse<AdminFilterOptionsResponse>> getFilterOptions(
      @RequestParam(name = "chapterCode", required = false) String chapterCode) {
    AdminFilterOptionsResponse response =
        adminAnalyticsService.getFilterOptions(sanitize(chapterCode));
    return ResponseEntity.ok(BaseResponse.success("관리자 필터 옵션 조회 성공", response));
  }

  @GetMapping("/analytics/insights")
  public ResponseEntity<BaseResponse<AdminEsAnalyticsResponse>> getEsInsights(
      @RequestParam(name = "from", required = false) String from,
      @RequestParam(name = "to", required = false) String to,
      @RequestParam(name = "timezone", required = false) String timezone,
      @RequestParam(name = "userIds", required = false) String userIds,
      @RequestParam(name = "chapterCode", required = false) String chapterCode,
      @RequestParam(name = "nodeCode", required = false) String nodeCode,
      @RequestParam(name = "topN", defaultValue = "20") int topN) {
    List<Long> parsedUserIds = parseUserIds(userIds);
    AdminEsAnalyticsResponse response =
        adminAnalyticsService.getEsInsights(
            sanitize(from),
            sanitize(to),
            sanitize(timezone),
            parsedUserIds,
            sanitize(chapterCode),
            sanitize(nodeCode),
            topN);
    return ResponseEntity.ok(BaseResponse.success("관리자 ES 분석 조회 성공", response));
  }

  private List<Long> parseUserIds(String userIds) {
    if (userIds == null || userIds.isBlank()) {
      return List.of();
    }
    return Arrays.stream(userIds.split(","))
        .map(String::trim)
        .filter(s -> !s.isBlank())
        .map(
            s -> {
              try {
                return Long.parseLong(s);
              } catch (NumberFormatException e) {
                return null;
              }
            })
        .filter(id -> id != null && id > 0)
        .distinct()
        .collect(Collectors.toList());
  }

  private String sanitize(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isBlank() ? null : trimmed;
  }
}
