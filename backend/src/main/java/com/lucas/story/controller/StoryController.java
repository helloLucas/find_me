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
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
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
    log.info(
        "User ID: {} started story (Chapter: {}). Reached NodeCode: {}",
        principal.getUserId(),
        request.getChapterCode(),
        response.getNodeCode());
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
    log.info(
        "User ID: {} is currently at NodeCode: {}", principal.getUserId(), response.getNodeCode());
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
    log.info(
        "User ID: {} processed transition (Action: {}). Reached Next NodeCode: {}",
        principal.getUserId(),
        request.getActionType(),
        response.getNextNode() != null ? response.getNextNode().getCode() : "STAY");
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(BaseResponse.success("상태 전이 성공", response));
  }

  /**
   * 사용자의 최근 터미널 명령어 입력 기록을 조회합니다.
   *
   * @return 최근 명령어 문자열 리스트
   */
  @GetMapping("/recent-commands")
  public ResponseEntity<BaseResponse<List<String>>> getRecentCommands(
      @AuthenticationPrincipal CustomUserPrincipal principal) {
    List<String> recentCommands = storyService.getRecentCommands(principal.getUserId());
    return ResponseEntity.ok(BaseResponse.success("최근 명령어 조회 성공", recentCommands));
  }

  /**
   * 터미널의 VFS 경로 자동완성 후보를 조회합니다.
   *
   * @param cwd 현재 작업 디렉토리
   * @param input 현재 입력 중인 경로 조각
   * @return 일치하는 파일 및 디렉토리명 리스트
   */
  @GetMapping("/autocomplete")
  public ResponseEntity<BaseResponse<List<String>>> getAutocompleteSuggestions(
      @AuthenticationPrincipal CustomUserPrincipal principal,
      @RequestParam(required = false) String cwd,
      @RequestParam(required = false) String input) {
    // 서비스 레이어를 호출하여 인증된 유저의 터미널 가상 파일 시스템 내 자동완성 후보군을 가져옵니다.
    List<String> suggestions =
        storyService.getAutocompleteSuggestions(principal.getUserId(), cwd, input);
    // 조회된 후보 리스트를 BaseResponse로 감싸서 성공 응답(200 OK)을 반환합니다.
    return ResponseEntity.ok(BaseResponse.success("자동완성 후보 조회 성공", suggestions));
  }
}
