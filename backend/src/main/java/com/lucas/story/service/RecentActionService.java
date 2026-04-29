package com.lucas.story.service;

import com.lucas.story.dto.redis.RecentActionEvent;

/** 사용자별/챕터별 최근 행동과 힌트용 현재 context를 Redis에 저장하는 서비스 인터페이스입니다. */
public interface RecentActionService {

  /**
   * transition 처리 결과를 Redis recent-actions list와 context hash에 저장합니다.
   *
   * @param event 저장할 최근 행동 이벤트
   */
  void recordAction(RecentActionEvent event);
}
