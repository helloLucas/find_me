package com.lucas.story.controller;

import com.lucas.auth.principal.CustomUserPrincipal;
import com.lucas.global.dto.BaseResponse;
import com.lucas.story.dto.request.StartStoryRequestDto;
import com.lucas.story.dto.request.TransitionRequestDto;
import com.lucas.story.dto.response.StoryNodeResponseDto;
import com.lucas.story.dto.response.TransitionResponseDto;
import com.lucas.story.service.StoryService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/story")
@RequiredArgsConstructor
public class StoryController {

  private final StoryService storyService;

  /**
   * 특정 챕터의 스토리를 시작하거나 재시작합니다.
   *
   * @param request 시작할 챕터 정보가 포함된 DTO
   * @return 챕터의 첫 번째 스토리 노드 정보
   */
  @PostMapping("/start")
  public ResponseEntity<BaseResponse<StoryNodeResponseDto>> startStory(
      @AuthenticationPrincipal CustomUserPrincipal principal,
      @Valid @RequestBody StartStoryRequestDto request) {
    StoryNodeResponseDto response = storyService.startStory(principal.getUserId(), request);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(BaseResponse.success("스토리 시작 성공", response));
  }

  /**
   * 사용자의 현재 진행 중인 스토리 노드 정보를 조회합니다.
   *
   * @return 현재 진행 중인 스토리 노드 정보
   */
  @GetMapping("/current")
  public ResponseEntity<BaseResponse<StoryNodeResponseDto>> findCurrentNode(
      @AuthenticationPrincipal CustomUserPrincipal principal) {
    StoryNodeResponseDto response = storyService.findCurrentNode(principal.getUserId());
    return ResponseEntity.ok(BaseResponse.success("현재 노드 조회 성공", response));
  }

  /**
   * 사용자의 입력에 따라 다음 스토리 노드로 전이를 처리합니다.
   *
   * @param request 사용자의 입력값 및 액션 타입이 포함된 DTO
   * @return 전이된 이후의 새로운 스토리 노드 정보
   */
  @PostMapping("/transitions")
  public ResponseEntity<BaseResponse<TransitionResponseDto>> processTransition(
      @AuthenticationPrincipal CustomUserPrincipal principal,
      @Valid @RequestBody TransitionRequestDto request) {
    TransitionResponseDto response = storyService.processTransition(principal.getUserId(), request);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(BaseResponse.success("상태 전이 성공", response));
  }

  /**
   * 현재 사용자의 최근 CLI 명령어 로그 10개를 조회합니다.
   *
   * @return 최근 명령어 리스트
   */
  @GetMapping("/commands")
  public ResponseEntity<BaseResponse<List<String>>> getRecentCommands(
      @AuthenticationPrincipal CustomUserPrincipal principal) {
    List<String> response = storyService.getRecentCommands(principal.getUserId());
    return ResponseEntity.ok(BaseResponse.success("최근 명령어 조회 성공", response));
  }
}
