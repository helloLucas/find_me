package com.lucas.story.dto.redis;

import lombok.Builder;
import lombok.Getter;

/** Redis recent-actions에 저장할 사용자 행동 요약 이벤트입니다. */
@Getter
@Builder
public class RecentActionEvent {

  private final Long userId;
  private final String chapterCode;
  private final String actionType;
  private final String input;
  private final String result;
  private final String nodeCode;
  private final String toNodeCode;
  private final String cwd;
  private final Integer snapshotVersion;
  private final Integer scanPercent;
}
