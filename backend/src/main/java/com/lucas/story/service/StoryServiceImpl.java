package com.lucas.story.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lucas.auth.entity.AuthProvider;
import com.lucas.auth.entity.UserRole;
import com.lucas.chapter.entity.Chapter;
import com.lucas.chapter.repository.ChapterRepository;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.progress.entity.UserStoryProgress;
import com.lucas.progress.repository.UserStoryProgressRepository;
import com.lucas.story.dto.request.StartStoryRequestDto;
import com.lucas.story.dto.request.TransitionRequestDto;
import com.lucas.story.dto.response.StoryNodeResponseDto;
import com.lucas.story.dto.response.TransitionResponseDto;
import com.lucas.story.dto.response.TransitionResponseDto.EffectDto;
import com.lucas.story.dto.response.TransitionResponseDto.NextNodeDto;
import com.lucas.story.entity.StoryNode;
import com.lucas.story.entity.StoryTransition;
import com.lucas.story.repository.StoryNodeRepository;
import com.lucas.story.repository.StoryTransitionRepository;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 스토리 진행 서비스 구현체.
 *
 * <p>플레이어의 스토리 시작, 현재 위치 조회, 상태 전이(transition) 처리, 그리고 입력 명령어 이력 조회 기능을 제공한다.
 *
 * <p>핵심 흐름: 1) 명령어 입력 시 Redis에 로깅 (RAG 역량 강화 및 유저 맥락 파악 용도) 2) Mock 명령어(ls, pwd 등)는 DB 조회 없이 즉시 응답
 * 반환 3) 일반 전이는 DB의 story_transitions 테이블을 기반으로 처리
 *
 * @see StoryService
 * @see CommandLogService
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StoryServiceImpl implements StoryService {

  private static final String GUEST_EMAIL = "guest@nexus.com";
  private static final String ACTION_TYPE_COMMAND = "command";

  private final UserRepository userRepository;
  private final ChapterRepository chapterRepository;
  private final StoryNodeRepository storyNodeRepository;
  private final StoryTransitionRepository storyTransitionRepository;
  private final UserStoryProgressRepository userStoryProgressRepository;
  private final CommandLogService commandLogService;
  private final ObjectMapper objectMapper;

  // ──────────────────────────────────────────────
  // 스토리 시작
  // ──────────────────────────────────────────────

  /**
   * 지정된 챕터의 스토리를 시작하고, 첫 번째 노드를 반환한다.
   *
   * @param request 챕터 코드를 포함한 시작 요청
   * @return 첫 번째 스토리 노드 응답 DTO
   * @throws CustomException E3001 - 챕터 미존재, E3002 - 노드 미존재, A1002 - 챕터 순서 위반
   */
  @Override
  @Transactional
  public StoryNodeResponseDto startStory(StartStoryRequestDto request) {
    // 요청된 챕터 코드로 챕터 조회
    Chapter chapter =
        chapterRepository
            .findByCode(request.getChapterCode())
            .orElseThrow(() -> new CustomException(ErrorCode.E3001));

    // 해당 챕터의 첫 번째 노드를 ID 순으로 조회
    StoryNode firstNode =
        storyNodeRepository
            .findFirstByChapter_CodeOrderByIdAsc(request.getChapterCode())
            .orElseThrow(() -> new CustomException(ErrorCode.E3002));

    // TODO: OAuth2 인증 연동 후 실제 로그인 유저로 교체 (현재는 게스트 유저 사용)
    User user = findOrCreateGuestUser();
    UserStoryProgress progress = userStoryProgressRepository.findById(user.getId()).orElse(null);

    // 챕터 순서 검증 (첫 챕터가 아닌데 이전 챕터 완료 기록이 없으면 차단)
    validateChapterProgression(progress, chapter);

    // 초기 스냅샷 생성 (챕터/노드 식별 정보만 포함)
    JsonNode emptySnapshot = createEmptySnapshot(chapter, firstNode);

    if (progress == null) {
      // 최초 플레이: 새 진행 레코드 생성
      progress =
          UserStoryProgress.builder()
              .user(user)
              .latestChapter(chapter)
              .latestNode(firstNode)
              .latestSnapshotJson(emptySnapshot)
              .build();
    } else {
      // 재시작: 기존 진행 레코드를 신규 챕터/노드로 갱신
      progress.updateProgress(chapter, firstNode, emptySnapshot);
    }

    userStoryProgressRepository.save(progress);
    log.info("Story started: User={}, Chapter={}", user.getId(), chapter.getCode());

    return StoryNodeResponseDto.from(firstNode);
  }

  // ──────────────────────────────────────────────
  // 현재 노드 조회
  // ──────────────────────────────────────────────

  /**
   * 현재 유저가 위치한 스토리 노드 정보를 반환한다.
   *
   * @return 현재 위치의 스토리 노드 응답 DTO
   * @throws CustomException E3003 - 진행 기록 미존재
   */
  @Override
  public StoryNodeResponseDto findCurrentNode() {
    // 현재 유저 조회
    User user = findOrCreateGuestUser();

    // 유저의 진행 기록 조회 (없으면 에러)
    UserStoryProgress progress =
        userStoryProgressRepository
            .findById(user.getId())
            .orElseThrow(() -> new CustomException(ErrorCode.E3003));

    // 마지막으로 도달한 노드 정보를 DTO로 변환하여 반환
    return StoryNodeResponseDto.from(progress.getLatestNode());
  }

  // ──────────────────────────────────────────────
  // 상태 전이 (Transition) 처리
  // ──────────────────────────────────────────────

  /**
   * 유저의 액션(명령어 입력, 클릭 등)을 받아 스토리 상태를 전이시킨다.
   *
   * <p>처리 우선순위: 1) 명령어 로깅 — Redis에 기록하여 RAG 및 유저 맥락 파악에 활용 2) Mock 명령어 — ls, pwd 등 시뮬레이션 대상이면 DB 조회
   * 없이 즉시 응답 3) DB 기반 전이 — story_transitions 테이블에서 매칭되는 전이를 찾아 상태 이동
   *
   * @param request 유저 액션 정보 (nodeId, actionType, inputValue)
   * @return 전이 결과 응답 DTO (다음 노드 + 효과)
   * @throws CustomException E3003 - 진행 기록 미존재, A1001 - 매칭 전이 없음
   */
  @Override
  @Transactional
  public TransitionResponseDto processTransition(TransitionRequestDto request) {
    // TODO: OAuth2 인증 연동 후 실제 로그인 유저로 교체
    User user = findOrCreateGuestUser();

    // ── Step 1: 명령어 로깅 (Redis) ──
    // 유저가 입력한 명령어를 Redis에 기록하여
    // 추후 RAG 기반 역량 분석 및 유저 맥락 파악에 활용한다.
    if (ACTION_TYPE_COMMAND.equals(request.getActionType())) {
      commandLogService.logCommand(user.getId(), request.getInputValue());
    }

    // ── Step 2: Mock 명령어 처리 ──
    // ls, pwd, whoami, cat 등 터미널 시뮬레이션 대상 명령어는
    // DB 전이를 거치지 않고 즉시 가상 응답을 반환한다.
    if (ACTION_TYPE_COMMAND.equals(request.getActionType())
        && isMockCommand(request.getInputValue())) {
      return handleMockCommand(request);
    }

    // ── Step 3: DB 기반 스토리 전이 ──
    // 현재 노드에서 출발하는 전이 목록을 우선순위 순으로 조회하고,
    // 유저의 액션과 매칭되는 전이를 찾아 다음 노드로 진행한다.
    UserStoryProgress progress =
        userStoryProgressRepository
            .findById(user.getId())
            .orElseThrow(() -> new CustomException(ErrorCode.E3003));

    // 현재 유저가 위치한 노드
    StoryNode currentNode = progress.getLatestNode();

    // 현재 노드에서 출발 가능한 전이 목록 (우선순위 내림차순)
    List<StoryTransition> transitions =
        storyTransitionRepository.findByFromNode_IdOrderByPriorityDesc(currentNode.getId());

    // 유저 입력과 매칭되는 전이 검색 (exact / regex 검증)
    StoryTransition matched =
        transitions.stream()
            .filter(t -> matchesTransition(t, request))
            .findFirst()
            .orElseThrow(() -> new CustomException(ErrorCode.A1001));

    // 매칭된 전이의 도착 노드 추출
    StoryNode nextNode = matched.getToNode();
    // 도착 노드가 속한 챕터 정보
    Chapter chapter = nextNode.getChapter();
    // 현재 상태 스냅샷 생성
    JsonNode snapshot = createEmptySnapshot(chapter, nextNode);

    // 유저 진행 상태를 다음 노드로 갱신 후 저장
    progress.updateProgress(chapter, nextNode, snapshot);
    userStoryProgressRepository.save(progress);

    // 다음 노드 정보를 응답 DTO로 변환하여 반환
    return buildResponseFromNode(nextNode);
  }

  // ──────────────────────────────────────────────
  // 명령어 이력 조회
  // ──────────────────────────────────────────────

  /**
   * 현재 유저의 최근 명령어 입력 이력을 Redis에서 조회하여 반환한다.
   *
   * @return 최근 입력 명령어 문자열 리스트
   */
  @Override
  public List<String> getRecentCommands() {
    User user = findOrCreateGuestUser();
    return commandLogService.getRecentCommands(user.getId());
  }

  // ══════════════════════════════════════════════
  //  Private Helper Methods
  // ══════════════════════════════════════════════

  /**
   * 게스트 유저를 조회하거나, 없으면 새로 생성한다.
   *
   * <p>TODO: OAuth2 인증이 완성되면 이 메서드를 제거하고, SecurityContext에서 인증된 유저를 가져오는 방식으로 전환해야 한다. 현재는 개발/테스트
   * 편의를 위해 고정 게스트 계정을 사용한다.
   *
   * @return 게스트 유저 엔티티
   */
  private User findOrCreateGuestUser() {
    // 고정 이메일로 게스트 유저 조회, 없으면 새로 생성하여 DB에 저장
    return userRepository
        .findByEmail(GUEST_EMAIL)
        .orElseGet(
            () ->
                userRepository.save(
                    User.builder()
                        .email(GUEST_EMAIL)
                        .oauthName("Guest")
                        .nickname("GuestUser")
                        .provider(AuthProvider.GOOGLE) // TODO: 게스트 전용 provider 분리
                        // 검토
                        .providerUserId("GUEST_" + System.currentTimeMillis()) // 고유성
                        // 보장용
                        // 타임스탬프
                        .role(UserRole.GUEST)
                        .build()));
  }

  /**
   * 주어진 명령어가 Mock(시뮬레이션) 대상인지 판별한다.
   *
   * <p>TODO: Mock 대상 명령어 목록을 설정 파일 또는 DB로 외부화할 것. 현재는 하드코딩된 리스트(ls, pwd, whoami, cat)로 판별한다.
   *
   * @param input 유저가 입력한 명령어 문자열
   * @return Mock 대상이면 true
   */
  private boolean isMockCommand(String input) {
    if (input == null) return false;
    // 첫 번째 토큰(명령어 이름)만 추출하여 목록과 비교
    String cmd = input.trim().split(" ")[0];
    return List.of("ls", "pwd", "whoami", "cat").contains(cmd);
  }

  /**
   * Mock 명령어에 대한 가상 터미널 응답을 생성한다.
   *
   * <p>TODO: 실제 터미널 시뮬레이션 엔진으로 교체 필요. 현재는 단순 문자열 조합으로 가짜 출력을 반환하는 목업(Mock) 상태이다. 향후 각 명령어별 파일시스템
   * 상태, 현재 디렉토리 등을 반영한 Context-aware 시뮬레이터를 구현해야 한다.
   *
   * @param request 유저 액션 정보
   * @return 가상 터미널 출력을 담은 응답 DTO
   */
  private TransitionResponseDto handleMockCommand(TransitionRequestDto request) {
    // 유저 입력 명령어 추출 (앞뒤 공백 제거)
    String input = request.getInputValue().trim();
    // TODO: 명령어별 분기 처리 구현 (ls → 파일목록, pwd → 경로, whoami → 유저명 등)
    String output = "Executing " + input + "... (Mock Output)";

    // Mock 응답 DTO 빌드 — 노드 이동 없이 가상 출력만 반환
    return TransitionResponseDto.builder()
        .nextNode(
            NextNodeDto.builder()
                .id(request.getNodeId()) // TODO: 실제 다음 노드 ID 계산 로직 필요
                .code("MOCK_NODE") // TODO: 실제 노드 코드로 교체
                .nodeType("system")
                .outputBundle(Map.of("stdout", output)) // 가상 stdout 출력
                .build())
        .result("success")
        .effects(
            List.of(
                EffectDto.builder().type("append_output").payload(output).build())) // 프론트에 출력 추가 지시
        .build();
  }

  /**
   * 전이(Transition)가 유저의 요청과 매칭되는지 검증한다. - actionType 일치 여부 확인 - validatorType에 따라 exact(완전 일치) 또는
   * regex(정규식) 비교
   *
   * <p>TODO: 'server_rule' validatorType 지원 추가 (서버 사이드 룰 엔진)
   *
   * @param t DB에서 조회한 전이 후보
   * @param request 유저의 액션 요청
   * @return 매칭되면 true
   */
  private boolean matchesTransition(StoryTransition t, TransitionRequestDto request) {
    // 액션 타입이 다르면 즉시 불일치
    if (!t.getActionType().equals(request.getActionType())) {
      return false;
    }
    // 입력값이 없으면 매칭 불가
    if (request.getInputValue() == null) return false;

    // validatorType에 따라 매칭 방식 분기
    return switch (t.getValidatorType()) {
      case "exact" -> request.getInputValue().equals(t.getExpectedInput()); // 완전 일치
      case "regex" -> request.getInputValue().matches(t.getExpectedInput()); // 정규식 매칭
      default -> false; // TODO: server_rule 등 추가 validatorType 지원 시 확장
    };
  }

  /**
   * DB에서 조회한 StoryNode를 TransitionResponseDto로 변환한다.
   *
   * <p>TODO: outputBundle, effectBundle 등 노드의 전체 데이터를 응답에 포함하도록 확장 필요. 현재는 메타데이터만 반환한다.
   *
   * @param node 전이 완료 후 도착한 스토리 노드
   * @return 전이 결과 응답 DTO
   */
  private TransitionResponseDto buildResponseFromNode(StoryNode node) {
    // 노드 메타데이터만 담아 응답 빌드 (outputBundle 등은 TODO)
    return TransitionResponseDto.builder()
        .nextNode(
            NextNodeDto.builder()
                .id(node.getId()) // 노드 PK
                .code(node.getCode()) // 노드 고유 코드 (e.g. CH1_FRIEND_CHAT_PUSH)
                .nodeType(node.getNodeType()) // narrative, console, network 등
                .promptType(node.getPromptType()) // command, click, inspect 등
                .isCheckpoint(node.isCheckpoint()) // 체크포인트 여부
                .isTerminal(node.isTerminal()) // 엔딩 노드 여부
                .build())
        .result("success")
        .build();
  }

  /**
   * 챕터 순서 검증: 이전 챕터를 완료하지 않으면 다음 챕터를 시작할 수 없다.
   *
   * <p>TODO: 챕터 완료 조건 상세 로직 구현 필요. 현재는 sortOrder == 1 (첫 챕터)만 무조건 허용하고, 그 외 챕터의 진행 조건(이전 챕터 ending
   * 도달 여부 등)은 미구현 상태이다.
   */
  private void validateChapterProgression(
      UserStoryProgress currentProgress, Chapter requestedChapter) {
    if (currentProgress == null) {
      // 진행 기록이 없으면 첫 번째 챕터만 시작 가능
      if (requestedChapter.getSortOrder() != 1) {
        throw new CustomException(ErrorCode.A1002);
      }
      return;
    }
    // TODO: 현재 챕터의 ending 노드 도달 여부를 확인하여
    //       다음 챕터 개방 조건을 검증하는 로직 추가 필요
  }

  /**
   * 챕터 시작 또는 전이 시 사용할 빈 스냅샷(JSON)을 생성한다.
   *
   * <p>TODO: observerClass(관측자 등급), privilegeLevel(권한), scanPercent(GC 스캔율), flags(진행 플래그),
   * inventory(파편 보유 현황) 등 게임 상태를 스냅샷에 포함하도록 확장 필요. 현재는 위치 식별 정보만 저장한다.
   */
  private JsonNode createEmptySnapshot(Chapter chapter, StoryNode node) {
    // 빈 JSON 객체 생성
    ObjectNode snapshot = objectMapper.createObjectNode();
    // 현재 위치 식별 정보만 기록
    snapshot.put("chapterId", chapter.getId()); // 챕터 PK
    snapshot.put("nodeId", node.getId()); // 노드 PK
    snapshot.put("nodeCode", node.getCode()); // 노드 코드
    // TODO: observerClass, privilegeLevel, scanPercent, flags, inventory 추가 시 여기서 확장
    return snapshot;
  }
}
