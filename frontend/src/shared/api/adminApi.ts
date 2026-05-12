import axiosInstance from "./axiosInstance";
import type { BaseResponse } from "../types/api";

export type AdminDashboardResponse = {
  summary: {
    totalUsers: number;
    memberUsers: number;
    guestUsers: number;
    adminUsers: number;
    activeUsers24h: number;
    usersWithStoryProgress: number;
    completedChapterEvents: number;
    avgHoursToChapterComplete: number;
  };
  chapterStats: Array<{
    chapterId: number;
    chapterCode: string;
    chapterTitle: string;
    unlockedUsers: number;
    completedUsers: number;
    completionRatePercent: number;
  }>;
  users: Array<{
    userId: number;
    email: string | null;
    nickname: string | null;
    role: "GUEST" | "MEMBER" | "ADMIN";
    latestChapterCode: string | null;
    latestNodeCode: string | null;
    completedChapterCount: number;
    lastProgressAt: string | null;
    lastLoginAt: string | null;
  }>;
};

export type AdminInsightsResponse = {
  filter: {
    userIds: number[];
    chapterCode: string | null;
    nodeCode: string | null;
    userLimit: number;
    recentLimit: number;
    days: number;
  };
  summary: {
    totalUsers: number;
    memberUsers: number;
    guestUsers: number;
    adminUsers: number;
    activeUsers24h: number;
    usersWithStoryProgress: number;
    completedChapterEvents: number;
    avgHoursToChapterComplete: number;
  };
  chapterStats: Array<{
    chapterId: number;
    chapterCode: string;
    chapterTitle: string;
    unlockedUsers: number;
    completedUsers: number;
    completionRatePercent: number;
  }>;
  dailyActivities: Array<{
    date: string;
    loginUsers: number;
    progressedUsers: number;
    completedChapterEvents: number;
  }>;
  revisitRanking: Array<{
    userId: number;
    email: string | null;
    nickname: string | null;
    role: "GUEST" | "MEMBER" | "ADMIN";
    activeDays: number;
    spanDays: number;
    revisitRatePercent: number;
    completedChapterCount: number;
    lastLoginAt: string | null;
  }>;
  nodeBottlenecks: Array<{
    chapterCode: string;
    nodeCode: string;
    usersAtNode: number;
  }>;
  users: Array<{
    userId: number;
    email: string | null;
    nickname: string | null;
    role: "GUEST" | "MEMBER" | "ADMIN";
    latestChapterCode: string | null;
    latestNodeCode: string | null;
    completedChapterCount: number;
    lastProgressAt: string | null;
    lastLoginAt: string | null;
    activeDays: number;
    spanDays: number;
    revisitRatePercent: number;
    recentFailCount: number;
    chapterClearTimes: Array<{
      chapterCode: string;
      unlockedAt: string | null;
      completedAt: string | null;
      hoursToComplete: number;
    }>;
    recentActionSummary: {
      totalEvents: number;
      successCount: number;
      failCount: number;
      errorCount: number;
      commandCount: number;
      inspectCount: number;
      clickCount: number;
      hintRequestedCount: number;
    };
    nodeActionStats: Array<{
      nodeCode: string;
      totalCount: number;
      successCount: number;
      failCount: number;
      errorCount: number;
      commandCount: number;
      inspectCount: number;
      clickCount: number;
      uniqueCommandCount: number;
    }>;
    commandActionStats: Array<{
      command: string;
      totalCount: number;
      successCount: number;
      failCount: number;
      errorCount: number;
    }>;
  }>;
  comparison: {
    enabled: boolean;
    chapterCode: string | null;
    nodeCode: string | null;
    leftUserId: number | null;
    rightUserId: number | null;
    leftSummary: {
      totalEvents: number;
      successCount: number;
      failCount: number;
      errorCount: number;
      commandCount: number;
      inspectCount: number;
      clickCount: number;
      hintRequestedCount: number;
    };
    rightSummary: {
      totalEvents: number;
      successCount: number;
      failCount: number;
      errorCount: number;
      commandCount: number;
      inspectCount: number;
      clickCount: number;
      hintRequestedCount: number;
    };
    nodeComparison: Array<{
      nodeCode: string;
      leftTotal: number;
      leftSuccess: number;
      leftFail: number;
      leftError: number;
      rightTotal: number;
      rightSuccess: number;
      rightFail: number;
      rightError: number;
    }>;
    commandComparison: Array<{
      command: string;
      leftTotal: number;
      leftSuccess: number;
      leftFail: number;
      leftError: number;
      rightTotal: number;
      rightSuccess: number;
      rightFail: number;
      rightError: number;
    }>;
  };
};

export type AdminEsAnalyticsResponse = {
  filter: {
    from: string;
    to: string;
    timezone: string;
    userIds: number[];
    chapterCode: string | null;
    nodeCode: string | null;
    topN: number;
  };
  source: {
    esEnabled: boolean;
    esReachable: boolean;
    fallbackUsed: boolean;
    indexPattern: string;
    message: string;
  };
  overview: {
    totalEvents: number;
    successCount: number;
    failCount: number;
    errorCount: number;
    hintRequestedCount: number;
    uniqueUsers: number;
    uniqueSessions: number;
    commandCount: number;
    inspectCount: number;
    clickCount: number;
  };
  timeline: Array<{
    date: string;
    totalCount: number;
    successCount: number;
    failCount: number;
    errorCount: number;
    hintRequestedCount: number;
    uniqueUsers: number;
  }>;
  bottlenecks: Array<{
    chapterCode: string;
    nodeCode: string;
    totalCount: number;
    failCount: number;
    errorCount: number;
    failRatePercent: number;
  }>;
  failCommands: Array<{
    command: string;
    totalCount: number;
    failCount: number;
    errorCount: number;
    uniqueUsers: number;
  }>;
  userJourneys: Array<{
    user: { userId: number; email: string | null; nickname: string | null; role: string };
    summary: {
      totalCount: number;
      successCount: number;
      failCount: number;
      errorCount: number;
      hintRequestedCount: number;
      uniqueSessions: number;
      latestActionAt: string | null;
    };
    nodeStats: Array<{
      nodeCode: string;
      totalCount: number;
      successCount: number;
      failCount: number;
      errorCount: number;
    }>;
    commandStats: Array<{
      command: string;
      totalCount: number;
      successCount: number;
      failCount: number;
      errorCount: number;
    }>;
    nodeActionSummaries: Array<{
      nodeCode: string;
      totalCount: number;
      successCount: number;
      failCount: number;
      errorCount: number;
      topActions: Array<{
        actionType: string;
        inputValue: string;
        totalCount: number;
        successCount: number;
        failCount: number;
        errorCount: number;
      }>;
    }>;
  }>;
  comparison: {
    enabled: boolean;
    leftUserId: number | null;
    rightUserId: number | null;
    leftSummary: {
      totalCount: number;
      successCount: number;
      failCount: number;
      errorCount: number;
      hintRequestedCount: number;
      uniqueSessions: number;
      latestActionAt: string | null;
    };
    rightSummary: {
      totalCount: number;
      successCount: number;
      failCount: number;
      errorCount: number;
      hintRequestedCount: number;
      uniqueSessions: number;
      latestActionAt: string | null;
    };
    nodeRows: Array<{
      nodeCode: string;
      leftTotal: number;
      leftSuccess: number;
      leftFail: number;
      leftError: number;
      rightTotal: number;
      rightSuccess: number;
      rightFail: number;
      rightError: number;
    }>;
    commandRows: Array<{
      command: string;
      leftTotal: number;
      leftSuccess: number;
      leftFail: number;
      leftError: number;
      rightTotal: number;
      rightSuccess: number;
      rightFail: number;
      rightError: number;
    }>;
  };
};

export type AdminUserOption = {
  userId: number;
  email: string | null;
  nickname: string | null;
  role: "GUEST" | "MEMBER" | "ADMIN" | string;
};

export type AdminFilterOptionsResponse = {
  chapters: Array<{
    chapterCode: string;
    chapterTitle: string;
  }>;
  nodes: Array<{
    nodeCode: string;
    chapterCode: string;
  }>;
};

export const adminApi = {
  getDashboard: async (limit = 100): Promise<AdminDashboardResponse> => {
    const response = await axiosInstance.get<BaseResponse<AdminDashboardResponse>>(
      `/api/v1/admin/dashboard?limit=${limit}`
    );
    return response.data.data;
  },
  getInsights: async (params: {
    userIds?: number[];
    chapterCode?: string | null;
    nodeCode?: string | null;
    userLimit?: number;
    recentLimit?: number;
    days?: number;
  }): Promise<AdminInsightsResponse> => {
    const q = new URLSearchParams();
    if (params.userIds && params.userIds.length > 0) q.set("userIds", params.userIds.join(","));
    if (params.chapterCode) q.set("chapterCode", params.chapterCode);
    if (params.nodeCode) q.set("nodeCode", params.nodeCode);
    if (params.userLimit) q.set("userLimit", String(params.userLimit));
    if (params.recentLimit) q.set("recentLimit", String(params.recentLimit));
    if (params.days) q.set("days", String(params.days));

    const response = await axiosInstance.get<BaseResponse<AdminInsightsResponse>>(
      `/api/v1/admin/insights?${q.toString()}`
    );
    return response.data.data;
  },
  searchUsers: async (params: { q?: string; limit?: number }): Promise<AdminUserOption[]> => {
    const q = new URLSearchParams();
    if (params.q) q.set("q", params.q);
    if (params.limit) q.set("limit", String(params.limit));
    const response = await axiosInstance.get<BaseResponse<AdminUserOption[]>>(
      `/api/v1/admin/users/search?${q.toString()}`
    );
    return response.data.data;
  },
  getFilterOptions: async (params: { chapterCode?: string | null }): Promise<AdminFilterOptionsResponse> => {
    const q = new URLSearchParams();
    if (params.chapterCode) q.set("chapterCode", params.chapterCode);
    const response = await axiosInstance.get<BaseResponse<AdminFilterOptionsResponse>>(
      `/api/v1/admin/filter-options?${q.toString()}`
    );
    return response.data.data;
  },
  getEsInsights: async (params: {
    from?: string;
    to?: string;
    timezone?: string;
    userIds?: number[];
    chapterCode?: string | null;
    nodeCode?: string | null;
    topN?: number;
  }): Promise<AdminEsAnalyticsResponse> => {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.timezone) q.set("timezone", params.timezone);
    if (params.userIds && params.userIds.length > 0) q.set("userIds", params.userIds.join(","));
    if (params.chapterCode) q.set("chapterCode", params.chapterCode);
    if (params.nodeCode) q.set("nodeCode", params.nodeCode);
    if (params.topN) q.set("topN", String(params.topN));
    const response = await axiosInstance.get<BaseResponse<AdminEsAnalyticsResponse>>(
      `/api/v1/admin/analytics/insights?${q.toString()}`
    );
    return response.data.data;
  },
};
