package com.lucas.admin.controller;

import com.lucas.admin.dto.response.AdminDashboardResponse;
import com.lucas.admin.dto.response.AdminEsAnalyticsResponse;
import com.lucas.admin.dto.response.AdminFilterOptionsResponse;
import com.lucas.admin.dto.response.AdminInsightsResponse;
import com.lucas.admin.service.AdminAnalyticsService;
import com.lucas.admin.service.AdminDashboardService;
import com.lucas.auth.entity.UserRole;
import com.lucas.auth.principal.CustomUserPrincipal;
import com.lucas.global.dto.BaseResponse;
import com.lucas.user.repository.UserRepository;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin")
public class AdminDashboardController {

  private final AdminDashboardService adminDashboardService;
  private final AdminAnalyticsService adminAnalyticsService;
  private final UserRepository userRepository;

  public record AdminMeResponse(Long userId, String role, boolean admin) {}

  @GetMapping("/me")
  public ResponseEntity<BaseResponse<AdminMeResponse>> me(
      @AuthenticationPrincipal CustomUserPrincipal principal) {
    UserRole role = assertAdminFromDb(principal);
    return ResponseEntity.ok(
        BaseResponse.success(
            "admin access verified",
            new AdminMeResponse(principal.getUserId(), role.name(), true)));
  }

  @GetMapping("/dashboard")
  public ResponseEntity<BaseResponse<AdminDashboardResponse>> getDashboard(
      @AuthenticationPrincipal CustomUserPrincipal principal,
      @RequestParam(name = "limit", defaultValue = "100") int limit) {
    assertAdminFromDb(principal);
    return ResponseEntity.ok(
        BaseResponse.success("admin dashboard loaded", adminDashboardService.getDashboard(limit)));
  }

  @GetMapping("/insights")
  public ResponseEntity<BaseResponse<AdminInsightsResponse>> getInsights(
      @AuthenticationPrincipal CustomUserPrincipal principal,
      @RequestParam(name = "userIds", required = false) String userIds,
      @RequestParam(name = "chapterCode", required = false) String chapterCode,
      @RequestParam(name = "nodeCode", required = false) String nodeCode,
      @RequestParam(name = "userLimit", defaultValue = "80") int userLimit,
      @RequestParam(name = "recentLimit", defaultValue = "50") int recentLimit,
      @RequestParam(name = "days", defaultValue = "14") int days) {
    assertAdminFromDb(principal);
    List<Long> parsedUserIds = parseUserIds(userIds);
    AdminInsightsResponse response =
        adminDashboardService.getInsights(
            parsedUserIds, sanitize(chapterCode), sanitize(nodeCode), userLimit, recentLimit, days);
    return ResponseEntity.ok(BaseResponse.success("admin insights loaded", response));
  }

  @GetMapping("/users/search")
  public ResponseEntity<BaseResponse<List<AdminEsAnalyticsResponse.UserOption>>> searchUsers(
      @AuthenticationPrincipal CustomUserPrincipal principal,
      @RequestParam(name = "q", required = false) String keyword,
      @RequestParam(name = "limit", defaultValue = "20") int limit) {
    assertAdminFromDb(principal);
    List<AdminEsAnalyticsResponse.UserOption> users =
        adminAnalyticsService.searchUsers(sanitize(keyword), limit);
    return ResponseEntity.ok(BaseResponse.success("admin users loaded", users));
  }

  @GetMapping("/filter-options")
  public ResponseEntity<BaseResponse<AdminFilterOptionsResponse>> getFilterOptions(
      @AuthenticationPrincipal CustomUserPrincipal principal,
      @RequestParam(name = "chapterCode", required = false) String chapterCode) {
    assertAdminFromDb(principal);
    AdminFilterOptionsResponse response =
        adminAnalyticsService.getFilterOptions(sanitize(chapterCode));
    return ResponseEntity.ok(BaseResponse.success("admin filters loaded", response));
  }

  @GetMapping("/analytics/insights")
  public ResponseEntity<BaseResponse<AdminEsAnalyticsResponse>> getEsInsights(
      @AuthenticationPrincipal CustomUserPrincipal principal,
      @RequestParam(name = "from", required = false) String from,
      @RequestParam(name = "to", required = false) String to,
      @RequestParam(name = "timezone", required = false) String timezone,
      @RequestParam(name = "userIds", required = false) String userIds,
      @RequestParam(name = "chapterCode", required = false) String chapterCode,
      @RequestParam(name = "nodeCode", required = false) String nodeCode,
      @RequestParam(name = "topN", defaultValue = "20") int topN) {
    assertAdminFromDb(principal);
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
    return ResponseEntity.ok(BaseResponse.success("admin analytics loaded", response));
  }

  private UserRole assertAdminFromDb(CustomUserPrincipal principal) {
    if (principal == null || principal.getUserId() == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
    UserRole role =
        userRepository
            .findById(principal.getUserId())
            .map(u -> u.getRole())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized"));
    if (role != UserRole.ADMIN) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
    }
    return role;
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
