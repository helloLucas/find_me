package com.lucas.progress.entity;

/** 유저별 챕터 진행 상태를 정의하는 Enum 클래스입니다. */
public enum ChapterStatus {
  /** 아직 해금되지 않은 상태 */
  LOCKED,
  /** 해금되어 플레이 가능한 상태 */
  UNLOCKED,
  /** 챕터를 완료한 상태 */
  COMPLETED
}
