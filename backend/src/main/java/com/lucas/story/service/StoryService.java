package com.lucas.story.service;

import com.lucas.story.dto.request.StartStoryRequestDto;
import com.lucas.story.dto.request.TransitionRequestDto;
import com.lucas.story.dto.response.StoryNodeResponseDto;
import com.lucas.story.dto.response.TransitionResponseDto;

public interface StoryService {

  /**
   * 특정 챕터의 스토리 진행을 시작하거나 재시작합니다.
   *
   * @param request 시작할 챕터 정보가 포함된 DTO
   * @return 시작된 챕터의 첫 번째 노드 정보
   */
  StoryNodeResponseDto startStory(Long userId, StartStoryRequestDto request);

  /**
   * 사용자의 현재 진행 중인 스토리 노드 정보를 조회합니다.
   *
   * @return 현재 진행 중인 노드 정보
   */
  StoryNodeResponseDto findCurrentNode(Long userId);

  /**
   * 사용자의 입력값에 따라 다음 스토리 노드로 상태를 전이시킵니다.
   *
   * @param request 동작 유형과 입력값이 포함된 DTO
   * @return 전이된 이후의 새로운 노드 정보
   */
  TransitionResponseDto processTransition(Long userId, TransitionRequestDto request);
}
