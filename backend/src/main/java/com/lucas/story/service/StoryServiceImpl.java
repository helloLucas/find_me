package com.lucas.story.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lucas.chapter.entity.Chapter;
import com.lucas.chapter.repository.ChapterRepository;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.progress.entity.ChapterStatus;
import com.lucas.progress.entity.UserChapterProgress;
import com.lucas.progress.entity.UserStoryProgress;
import com.lucas.progress.repository.UserChapterProgressRepository;
import com.lucas.progress.repository.UserStoryProgressRepository;
import com.lucas.story.dto.redis.RecentActionEvent;
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
import com.lucas.story.service.logging.StoryActionLogEvent;
import com.lucas.story.service.logging.StoryActionLogService;
import com.lucas.story.service.redis.StoryRecentEvent;
import com.lucas.story.service.redis.StorySessionRedisService;
import com.lucas.story.service.redis.StorySessionState;
import com.lucas.story.service.terminal.*;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * 스토리 진행 서비스 구현체.
 *
 * <p>
 * 플레이어의 스토리 시작, 현재 위치 조회, 상태 전이(transition) 처리, 그리고 최근 행동 맥락 기록 기능을 제공한다.
 *
 * <p>
 * 핵심 흐름: 1) DB의 story_transitions 테이블 기반으로 전이 매칭 2) 진행 상태와 스냅샷 갱신 3) 확정된 전이 결과를
 * Redis
 * recent-actions/context에 기록
 *
 * @see StoryService
 * @see RecentActionService
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StoryServiceImpl implements StoryService {

  private static final String ACTION_TYPE_COMMAND = "command";
  private static final String ACTION_TYPE_CLICK = "click";
  private static final String DISMISS_INPUT = "dismiss";
  private static final String RULE_AUTO_SYSTEM = "AUTO_SYSTEM";
  private static final String RULE_NORMALIZED_COMMAND = "NORMALIZED_COMMAND";
  private static final String RULE_VIRTUAL_FS_COMMAND = "VIRTUAL_FS_COMMAND";
  private static final String RULE_PARSED_TAR_COMMAND = "PARSED_TAR_COMMAND";
  private static final String RULE_NC_SEND_FILE = "NC_SEND_FILE";
  private static final String RULE_CHAINED_COMMAND = "CHAINED_COMMAND";
  private static final String CHAPTER_02_CODE = "week02";
  private static final String CHAPTER_02_VFS_VERSION = "chapter02-v1";
  private static final String CHAPTER_02_DEFAULT_CWD = "/home/guest";
  private static final String CHAPTER_02_PROMPT_USER = "guest";
  private static final String CHAPTER_02_PROMPT_HOST = "lucas-server";

  private final UserRepository userRepository;
  private final ChapterRepository chapterRepository;
  private final StoryNodeRepository storyNodeRepository;
  private final StoryTransitionRepository storyTransitionRepository;
  private final UserStoryProgressRepository userStoryProgressRepository;
  private final UserChapterProgressRepository userChapterProgressRepository;
  private final RecentActionService recentActionService;
  private final TerminalCommandService terminalCommandService;
  private final StoryActionLogService storyActionLogService;
  private final StorySessionRedisService storySessionRedisService;
  private final ObjectMapper objectMapper;
  private final PathResolver pathResolver = new PathResolver();

  private JsonNode chapter02Vfs;

  /**
   * Bean 초기화 시 Chapter 2 정적 VFS 리소스를 메모리에 로드합니다.
   *
   * <p>
   * 전이 검증과 자유 터미널 fallback 모두 동일한 정적 VFS 정의를 사용해야 하므로 애플리케이션 시작 시 한 번만 로드합니다.
   */
  @PostConstruct
  public void init() {
    // Chapter 2 VFS JSON을 classpath 리소스에서 읽어 필드에 캐싱합니다.
    loadVfsJson();
  }

  /**
   * classpath의 Chapter 2 VFS JSON 파일을 읽어 {@code chapter02Vfs}에 저장합니다.
   *
   * <p>
   * 리소스가 없거나 파싱에 실패하더라도 서비스 기동 자체는 막지 않고 로그만 남깁니다. 실제 명령 처리 시에는 빈 VFS fallback이
   * 적용됩니다.
   */
  private void loadVfsJson() {
    // try-with-resources로 리소스 스트림을 자동 해제합니다.
    try (InputStream is = getClass().getResourceAsStream("/story/chapter02/vfs.json")) {
      // 리소스가 존재하는 경우에만 JSON을 파싱합니다.
      if (is != null) {
        // Jackson으로 정적 VFS JSON tree를 읽어 필드에 저장합니다.
        this.chapter02Vfs = objectMapper.readTree(is);
        // 정상 로드 여부를 운영 로그에서 확인할 수 있도록 남깁니다.
        log.info("Loaded Chapter 2 VFS from /story/chapter02/vfs.json");
      }
    } catch (Exception e) {
      // VFS 로딩 실패는 Chapter 2 터미널 기능에 영향을 주므로 error 로그로 기록합니다.
      log.error("Failed to load Chapter 2 VFS", e);
    }
  }

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
  public StoryNodeResponseDto startStory(Long userId, StartStoryRequestDto request) {
    // 요청된 챕터 코드로 챕터 조회
    Chapter chapter = chapterRepository
        .findByCode(request.getChapterCode())
        .orElseThrow(() -> new CustomException(ErrorCode.E3001));

    // 해당 챕터의 첫 번째 노드를 ID 순으로 조회
    StoryNode firstNode = storyNodeRepository
        .findFirstByChapter_CodeOrderByIdAsc(request.getChapterCode())
        .orElseThrow(() -> new CustomException(ErrorCode.E3002));

    User user = getAuthenticatedUser(userId);
    UserStoryProgress progress = userStoryProgressRepository.findById(user.getId()).orElse(null);

    // 챕터 해금 상태 검증
    validateChapterUnlocked(user, chapter);

    // 초기 스냅샷 생성 (챕터/노드 식별 정보만 포함)
    JsonNode emptySnapshot = createEmptySnapshot(chapter, firstNode);

    if (progress == null) {
      // 최초 플레이: 새 진행 레코드 생성
      progress = UserStoryProgress.builder()
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
  @Transactional
  public StoryNodeResponseDto findCurrentNode(Long userId) {
    // 유저 조회
    User user = getAuthenticatedUser(userId);

    // 유저의 진행 기록 조회 (없으면 에러)
    UserStoryProgress progress = userStoryProgressRepository
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
   * <p>
   * 처리 순서: 1) 현재 진행 상태 조회 2) story_transitions 테이블에서 매칭되는 전이 검색 3) 진행 상태 갱신 4)
   * 확정된 결과를 Redis
   * recent-actions/context에 기록
   *
   * @param request 유저 액션 정보 (nodeId, actionType, inputValue)
   * @return 전이 결과 응답 DTO (다음 노드 + 효과)
   * @throws CustomException E3003 - 진행 기록 미존재, A1001 - 매칭 전이 없음
   */
  @Override
  @Transactional
  public TransitionResponseDto processTransition(Long userId, TransitionRequestDto request) {
    User user = getAuthenticatedUser(userId);

    // ── Step 1: DB 기반 스토리 전이 ──
    // 현재 노드에서 출발하는 전이 목록을 우선순위 순으로 조회하고,
    // 유저의 액션과 매칭되는 전이를 찾아 다음 노드로 진행한다.
    UserStoryProgress progress = userStoryProgressRepository
        .findById(user.getId())
        .orElseThrow(() -> new CustomException(ErrorCode.E3003));

    // 현재 유저가 위치한 노드와 챕터 (에러 로그용으로 보관)
    StoryNode currentNode = progress.getLatestNode();
    Chapter currentChapter = currentNode.getChapter();

    try {
      // 현재 노드에서 출발 가능한 전이 목록 (우선순위 내림차순)
      List<StoryTransition> transitions = storyTransitionRepository
          .findByFromNode_IdOrderByPriorityDesc(currentNode.getId());

      // server_rule matcher가 flags/cwd/vfsOverlay를 볼 수 있도록 현재 snapshot을 한 번 꺼낸다.
      JsonNode latestSnapshot = progress.getLatestSnapshotJson();

      // 유저 입력과 매칭되는 전이 검색 (exact / regex 검증)
      StoryTransition matched = transitions.stream()
          .filter(t -> matchesTransition(t, request, latestSnapshot))
          .findFirst()
          .orElse(null);

      if (matched == null) {
        // ── Step 2: Chapter 2 터미널 Fallback ──
        // DB 전이에 실패했을 때, Chapter 2 터미널 노드라면 가상 파일 시스템 로직으로 처리한다.
        TransitionResponseDto terminalResponse = handleChapter2TerminalFallback(user, progress, currentNode, request);
        if (terminalResponse != null) {
          return terminalResponse;
        }

        // 예상치 못한 오류(ERROR)를 ES에 기록
        logStoryAction(user, progress.getLatestChapter(), currentNode, null, request, "ERROR");

        // 매칭 실패도 힌트 맥락에 필요하므로 기존 진행 상태 기준으로 recent-actions에 남긴다.
        CustomException e = new CustomException(ErrorCode.A1001);
        recordRejectedTransitionAction(user, progress, currentNode, request, e);
        // 기존 API 에러 응답 흐름은 유지해야 하므로 원래 예외를 다시 던진다.
        throw e;
      }

      // 매칭된 전이의 도착 노드 추출
      StoryNode nextNode = matched.getToNode();

      // ── FAIL 노드 판별 ──
      // 코드에 "_FAIL_"이 포함된 노드는 일시적 피드백 전용 노드이다.
      // FAIL 노드로 이동 시에는 유저 진행 상태를 갱신하지 않고, result=retry로 반환한다.
      boolean isFailNode = nextNode.getCode().contains("_FAIL_");

      if (isFailNode) {
        Chapter failChapter = nextNode.getChapter();
        JsonNode failSnapshot = createTransitionSnapshot(
            failChapter, nextNode, latestSnapshot, request, matched.getEffectBundle());
        progress.updateProgress(failChapter, nextNode, failSnapshot);
        userStoryProgressRepository.save(progress);

        log.info(
            "Fail node reached (progress updated): User={}, FailNode={}",
            user.getId(),
            nextNode.getCode());

        // ELK/RAG 행동 로깅 (incoming)
        logStoryAction(user, failChapter, currentNode, nextNode, request, "FAIL");

        // 실패 노드 이동 결과를 transaction commit 이후 Redis recent-actions에 반영한다.
        recordRecentActionAfterCommit(
            buildRecentActionEvent(
                user,
                failChapter,
                request,
                matched,
                currentNode,
                nextNode,
                failSnapshot,
                "FAIL_RETRY"));
        // 기존 프론트 응답 result는 retry를 유지한다.
        return buildResponseFromNode(nextNode, matched.getEffectBundle(), "retry", failSnapshot);
      }

      // 도착 노드가 속한 챕터 정보
      Chapter chapter = nextNode.getChapter();
      // 현재 상태 스냅샷 생성
      JsonNode snapshot = createTransitionSnapshot(
          chapter, nextNode, latestSnapshot, request, matched.getEffectBundle());

      // 유저 진행 상태를 다음 노드로 갱신 후 저장
      progress.updateProgress(chapter, nextNode, snapshot);
      userStoryProgressRepository.save(progress);

      // ── Step 4: 챕터 완료 및 다음 챕터 해금 처리 ──
      // 도착한 노드가 종단 노드(엔딩)인 경우, 현재 챕터를 완료 처리하고 다음 챕터를 해금한다.
      if (nextNode.isTerminal() || "ending".equals(nextNode.getNodeType())) {
        handleChapterCompletion(user, chapter);
      }

      logStoryAction(user, chapter, currentNode, nextNode, request, "SUCCESS");
      // 다음 노드 정보와 전이 효과(effects)를 응답 DTO로 변환하여 반환
      // 정상 이동 결과를 transaction commit 이후 Redis recent-actions에 반영한다.
      recordRecentActionAfterCommit(
          buildRecentActionEvent(
              user, chapter, request, matched, currentNode, nextNode, snapshot, "SUCCESS_MOVE"));

      return buildResponseFromNode(nextNode, matched.getEffectBundle(), "success", snapshot);
    } catch (Exception e) {
      // 예상치 못한 시스템 에러 발생 시 ERROR 로그를 남기고 예외를 다시 던집니다.
      if (!(e instanceof CustomException)) {
        log.error(
            "Critical error during processTransition: User={}, Action={}",
            user.getId(),
            request.getActionType(),
            e);
        logStoryAction(user, currentChapter, currentNode, null, request, "ERROR");
      }
      throw e;
    }
  }

  // ──────────────────────────────────────────────
  // 명령어 이력 조회
  // ──────────────────────────────────────────────

  /** ELK에 보낼 행동 로깅(command/inspect/click) 처리를 별도 묶음 메서드로 분리. */
  private void logStoryAction(
      User user,
      Chapter chapter,
      StoryNode currentNode,
      StoryNode nextNode,
      TransitionRequestDto request,
      String result) {

    String actionType = request.getActionType();
    // command, inspect, click 외의 액션은 필요시 필터링 가능 (일단 모든 액션을 고려해 적용)
    if (actionType == null || actionType.isBlank()) {
      log.warn("ActionType is empty, skipping StoryAction log.");
      return;
    }

    String rawInput = request.getInputValue() == null ? "" : request.getInputValue();
    String normInput = storyActionLogService.normalizeInputValue(rawInput);

    String sessionId = resolveSessionId(user, request);

    // Redis fail_count 조회/갱신
    // FAIL 또는 ERROR일 때 카운트를 올리고, SUCCESS일 때만 리셋합니다.
    boolean isFail = "FAIL".equals(result) || "ERROR".equals(result);
    boolean isSuccess = "SUCCESS".equals(result);
    boolean shouldResetFailCountOnSuccess = isSuccess
        && !(ACTION_TYPE_CLICK.equals(actionType) && DISMISS_INPUT.equals(normInput));

    int failCountAfterAction = storyActionLogService.updateAndGetFailCount(
        sessionId, isFail, shouldResetFailCountOnSuccess);

    // hint_requested 여부 추출
    boolean hintRequested = false;
    if (request.getMeta() != null && request.getMeta().containsKey("hintRequested")) {
      hintRequested = Boolean.parseBoolean(String.valueOf(request.getMeta().get("hintRequested")));
    }

    // state_version 추출
    int stateVersion = 1;
    if (request.getMeta() != null && request.getMeta().containsKey("stateVersion")) {
      try {
        stateVersion = Integer.parseInt(String.valueOf(request.getMeta().get("stateVersion")));
      } catch (NumberFormatException ignored) {
      }
    }

    String timestamp = storyActionLogService.generateTimestamp();
    String chapterId = chapter != null ? chapter.getCode() : "UNKNOWN";
    String fromNodeId = currentNode != null ? currentNode.getCode() : "UNKNOWN";
    String toNodeId = nextNode != null ? nextNode.getCode() : "UNKNOWN";

    StoryActionLogEvent event = StoryActionLogEvent.builder()
        .timestamp(timestamp)
        .sessionId(sessionId)
        .userId(user.getId())
        .chapterId(chapterId)
        .fromNodeId(fromNodeId)
        .toNodeId(toNodeId)
        .actionType(actionType)
        .inputValue(rawInput)
        .inputValueNorm(normInput)
        .result(result)
        .failCountAfterAction(failCountAfterAction)
        .hintRequested(hintRequested)
        .stateVersion(stateVersion)
        .build();

    storySessionRedisService.recordAction(
        sessionId,
        new StorySessionState(user.getId(), chapterId, toNodeId, stateVersion),
        new StoryRecentEvent(
            timestamp,
            actionType,
            rawInput,
            normInput,
            result,
            fromNodeId,
            toNodeId,
            hintRequested));

    // 한 줄 JSON 형태로 로거에 쏨
    storyActionLogService.logAction(event);
  }

  private String resolveSessionId(User user, TransitionRequestDto request) {
    String sessionId = "sess_user_" + user.getId();
    if (request.getMeta() != null && request.getMeta().containsKey("sessionId")) {
      sessionId = String.valueOf(request.getMeta().get("sessionId"));
    }
    return sessionId;
  }

  /**
   * 현재 유저의 최근 명령어 입력 이력을 Redis에서 조회하여 반환한다.
   *
   * @return 최근 입력 명령어 문자열 리스트
   */
  @Transactional
  public List<String> getRecentCommands(Long userId) {
    // 유저 조회
    User user = getAuthenticatedUser(userId);
    // Redis에서 해당 유저의 최근 명령어 리스트 조회 (세션 아이디 기반)
    String sessionId = "sess_user_" + user.getId();
    return storySessionRedisService.getRecentCommands(sessionId);
  }

  // ══════════════════════════════════════════════
  // Private Helper Methods
  // ══════════════════════════════════════════════

  /**
   * 매칭되는 transition이 없어서 거절된 요청을 Redis recent-actions에 기록한다.
   *
   * @param user        요청을 보낸 인증 유저
   * @param progress    유저의 현재 스토리 진행 상태
   * @param currentNode 요청 당시 유저가 위치한 노드
   * @param request     유저가 보낸 transition 요청
   * @param exception   transition 매칭 실패 예외
   */
  private void recordRejectedTransitionAction(
      User user,
      UserStoryProgress progress,
      StoryNode currentNode,
      TransitionRequestDto request,
      CustomException exception) {
    // 현재 진행 중인 챕터 코드를 Redis key 구성에 사용한다.
    String chapterCode = progress.getLatestChapter().getCode();

    // 매칭 실패 시점에는 DB에 저장된 최신 snapshot이 그대로 현재 context이다.
    JsonNode snapshot = progress.getLatestSnapshotJson();

    // 요청 actionType과 예외 종류를 기준으로 recent-actions result 값을 결정한다.
    String result = resolveRejectedResult(request, exception);

    // Redis에 저장할 최근 행동 이벤트를 현재 상태 기준으로 구성한다.
    RecentActionEvent event = RecentActionEvent.builder()
        .userId(user.getId())
        .chapterCode(chapterCode)
        .actionType(request.getActionType())
        .input(request.getInputValue())
        .result(result)
        .nodeCode(currentNode.getCode())
        .cwd(resolveCwd(snapshot, request))
        .snapshotVersion(extractInteger(snapshot, "/snapshotVersion"))
        .scanPercent(extractInteger(snapshot, "/scanPercent"))
        .build();

    // DB 변경이 없는 거절 이벤트는 transaction commit을 기다리지 않고 즉시 Redis에 기록한다.
    recentActionService.recordAction(event);
  }

  /**
   * transition 처리 결과를 Redis recent-actions에 남길 이벤트로 변환한다.
   *
   * @param user           요청을 보낸 인증 유저
   * @param chapter        transition 이후 유저가 위치한 챕터
   * @param request        유저가 보낸 transition 요청
   * @param transition     매칭된 story transition
   * @param fromNode       transition 출발 노드
   * @param toNode         transition 도착 노드
   * @param snapshot       transition 이후 저장할 snapshot
   * @param fallbackResult effect_bundle에 recentResult가 없을 때 사용할 기본 result
   * @return Redis에 저장할 최근 행동 이벤트
   */
  private RecentActionEvent buildRecentActionEvent(
      User user,
      Chapter chapter,
      TransitionRequestDto request,
      StoryTransition transition,
      StoryNode fromNode,
      StoryNode toNode,
      JsonNode snapshot,
      String fallbackResult) {
    // effect_bundle에 명시된 recentResult가 있으면 우선 사용한다.
    String result = resolveRecentResult(transition, fallbackResult);

    // Redis recent-actions list와 context hash에 저장할 이벤트 객체를 구성한다.
    return RecentActionEvent.builder()
        .userId(user.getId())
        .chapterCode(chapter.getCode())
        .actionType(request.getActionType())
        .input(request.getInputValue())
        .result(result)
        .nodeCode(fromNode.getCode())
        .toNodeCode(toNode.getCode())
        .cwd(resolveCwd(snapshot, request))
        .snapshotVersion(extractInteger(snapshot, "/snapshotVersion"))
        .scanPercent(extractInteger(snapshot, "/scanPercent"))
        .build();
  }

  /**
   * 현재 transaction이 commit된 뒤 recent-actions를 기록한다.
   *
   * @param event Redis에 저장할 최근 행동 이벤트
   */
  private void recordRecentActionAfterCommit(RecentActionEvent event) {
    // transaction 동기화가 활성화되어 있으면 DB commit 이후 Redis 기록을 예약한다.
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      // rollback된 진행 결과가 Redis에 남지 않도록 afterCommit hook을 등록한다.
      TransactionSynchronizationManager.registerSynchronization(
          new TransactionSynchronization() {
            /** DB transaction commit 이후 Redis recent-actions에 이벤트를 기록한다. */
            @Override
            public void afterCommit() {
              // commit된 DB 상태와 Redis 힌트 맥락을 맞추기 위해 commit 이후에만 기록한다.
              recentActionService.recordAction(event);
            }
          });

      // commit hook 등록이 끝났으므로 즉시 기록하지 않고 메서드를 종료한다.
      return;
    }

    // transaction 밖에서 호출된 경우에는 지연시킬 commit hook이 없으므로 바로 Redis에 기록한다.
    recentActionService.recordAction(event);
  }

  /**
   * effect_bundle.recentResult를 우선 사용하고 없으면 기본 result를 반환한다.
   *
   * @param transition     매칭된 story transition
   * @param fallbackResult 기본 result 코드
   * @return recent-actions에 저장할 result 코드
   */
  private String resolveRecentResult(StoryTransition transition, String fallbackResult) {
    // transition이 없으면 effect_bundle을 읽을 수 없으므로 기본 result를 사용한다.
    if (transition == null) {
      // 호출자가 넘긴 기본 result를 그대로 반환한다.
      return fallbackResult;
    }

    // transition에 연결된 effect_bundle JSON을 꺼낸다.
    JsonNode effectBundle = transition.getEffectBundle();

    // effect_bundle이 비어 있으면 recentResult도 없으므로 기본 result를 사용한다.
    if (effectBundle == null || effectBundle.isEmpty()) {
      // 별도 result 정의가 없는 transition은 호출자의 기본값으로 기록한다.
      return fallbackResult;
    }

    // Chapter 2 seed에서 사용하는 recentResult 필드를 우선 확인한다.
    JsonNode recentResult = effectBundle.get("recentResult");

    // recentResult가 문자열 값으로 존재하면 그 값을 Redis에 저장한다.
    if (recentResult != null && recentResult.isTextual() && !recentResult.asText().isBlank()) {
      // seed/effect_bundle이 지정한 세부 result 코드를 반환한다.
      return recentResult.asText();
    }

    // recentResult가 없으면 기본 result를 사용한다.
    return fallbackResult;
  }

  /**
   * transition 매칭 실패 예외를 recent-actions result 코드로 변환한다.
   *
   * @param request   유저가 보낸 transition 요청
   * @param exception transition 처리 중 발생한 예외
   * @return recent-actions에 저장할 실패 result 코드
   */
  private String resolveRejectedResult(TransitionRequestDto request, CustomException exception) {
    // A1001은 현재 노드에서 허용되지 않는 action/input 조합을 의미한다.
    boolean transitionNotAllowed = exception.getErrorCode() == ErrorCode.A1001;

    // command 입력이 transition에 매칭되지 않으면 힌트용으로 command not found에 가깝게 남긴다.
    if (transitionNotAllowed && ACTION_TYPE_COMMAND.equals(request.getActionType())) {
      // Chapter 2 recent-actions 정책의 표준 result 코드를 사용한다.
      return "FAIL_COMMAND_NOT_FOUND";
    }

    // command가 아닌 click/inspect/choice 실패는 순서 또는 대상 오류에 가깝게 기록한다.
    if (transitionNotAllowed) {
      // 별도 표준 코드가 없으므로 이미 문서화된 FAIL_WRONG_ORDER를 사용한다.
      return "FAIL_WRONG_ORDER";
    }

    // 그 외 예외는 일반적인 transition 거절로 간주한다.
    return "FAIL_WRONG_ORDER";
  }

  /**
   * snapshot 또는 요청 meta에서 현재 가상 터미널 경로를 결정한다.
   *
   * @param snapshot 값을 읽을 snapshot JSON
   * @param request  유저가 보낸 transition 요청
   * @return cwd 값이 있으면 해당 값, 없으면 null
   */
  private String resolveCwd(JsonNode snapshot, TransitionRequestDto request) {
    // snapshot.terminal.cwd가 영속 상태 기준의 최우선 cwd 값이다.
    String snapshotCwd = extractText(snapshot, "/terminal/cwd");

    // snapshot에 cwd가 있으면 요청 meta보다 신뢰할 수 있으므로 바로 반환한다.
    if (snapshotCwd != null && !snapshotCwd.isBlank()) {
      // 영속 snapshot에서 읽은 cwd를 사용한다.
      return snapshotCwd;
    }

    // request가 없으면 meta에서 cwd fallback을 읽을 수 없다.
    if (request == null) {
      // 저장할 cwd가 없으므로 null을 반환한다.
      return null;
    }

    // frontend가 command 실행 시 전달하는 meta map을 꺼낸다.
    Map<String, Object> meta = request.getMeta();

    // meta가 없으면 fallback cwd도 없다.
    if (meta == null || meta.isEmpty()) {
      // 저장할 cwd가 없으므로 null을 반환한다.
      return null;
    }

    // 현재 프론트는 터미널 경로를 directory 키로 전달한다.
    Object directory = meta.get("directory");

    // directory가 문자열이면 Redis context cwd fallback으로 사용할 수 있다.
    if (directory instanceof String directoryText && !directoryText.isBlank()) {
      // frontend 요청 meta에서 읽은 directory 값을 반환한다.
      return directoryText;
    }

    // 지원하는 cwd fallback 값이 없으면 null을 반환한다.
    return null;
  }

  /**
   * JsonNode에서 JSON Pointer 경로의 문자열 값을 추출한다.
   *
   * @param snapshot 값을 읽을 snapshot JSON
   * @param pointer  JSON Pointer 경로
   * @return 문자열 값이 있으면 해당 값, 없으면 null
   */
  private String extractText(JsonNode snapshot, String pointer) {
    // snapshot이 없으면 경로 탐색을 수행할 수 없다.
    if (snapshot == null) {
      // 저장할 context 값이 없으므로 null을 반환한다.
      return null;
    }

    // JSON Pointer를 사용해 원하는 하위 node를 찾는다.
    JsonNode value = snapshot.at(pointer);

    // 경로가 없거나 null이면 저장할 문자열 값도 없다.
    if (value.isMissingNode() || value.isNull()) {
      // Redis payload에서 생략되도록 null을 반환한다.
      return null;
    }

    // 문자열 node는 원문 문자열 값을 그대로 사용한다.
    if (value.isTextual()) {
      // text value를 반환한다.
      return value.asText();
    }

    // 문자열이 아닌 값은 context text로 쓰지 않는다.
    return null;
  }

  /**
   * JsonNode에서 JSON Pointer 경로의 정수 값을 추출한다.
   *
   * @param snapshot 값을 읽을 snapshot JSON
   * @param pointer  JSON Pointer 경로
   * @return 정수 값이 있으면 해당 값, 없으면 null
   */
  private Integer extractInteger(JsonNode snapshot, String pointer) {
    // snapshot이 없으면 경로 탐색을 수행할 수 없다.
    if (snapshot == null) {
      // 저장할 context 값이 없으므로 null을 반환한다.
      return null;
    }

    // JSON Pointer를 사용해 원하는 하위 node를 찾는다.
    JsonNode value = snapshot.at(pointer);

    // 경로가 없거나 null이면 저장할 정수 값도 없다.
    if (value.isMissingNode() || value.isNull()) {
      // Redis payload에서 생략되도록 null을 반환한다.
      return null;
    }

    // 정수 JSON number는 그대로 int 값으로 변환한다.
    if (value.canConvertToInt()) {
      // Integer wrapper로 반환해 null 가능성을 유지한다.
      return value.asInt();
    }

    // 정수로 변환할 수 없는 값은 context number로 쓰지 않는다.
    return null;
  }

  /**
   * 인증된 유저를 조회하고, 스토리 진행을 위한 초기 환경(1챕터 해금)을 확인/조성한다.
   *
   * @param userId 유저 식별값
   * @return 유저 엔티티
   * @throws CustomException E3000 - 유저 미존재
   */
  private User getAuthenticatedUser(Long userId) {
    User user = userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.E3000));

    // 최초 플레이인 경우 진행 환경(1챕터 해금 및 최초 스토리 진행 레코드)을 조성해준다.
    if (!userChapterProgressRepository.existsByUserId(user.getId())) {
      chapterRepository
          .findBySortOrder(1)
          .ifPresent(
              firstChapter -> {
                // 1. 챕터 해금 처리
                userChapterProgressRepository.save(
                    UserChapterProgress.builder()
                        .user(user)
                        .chapter(firstChapter)
                        .status(ChapterStatus.UNLOCKED)
                        .build());

                // 2. 해당 챕터의 첫 번째 노드 조회
                storyNodeRepository
                    .findFirstByChapter_CodeOrderByIdAsc(firstChapter.getCode())
                    .ifPresent(
                        firstNode -> {
                          // 3. 최초 스토리 진행 레코드(UserStoryProgress) 생성
                          if (!userStoryProgressRepository.existsById(user.getId())) {
                            userStoryProgressRepository.save(
                                UserStoryProgress.builder()
                                    .user(user)
                                    .latestChapter(firstChapter)
                                    .latestNode(firstNode)
                                    .latestSnapshotJson(
                                        createEmptySnapshot(firstChapter, firstNode))
                                    .build());
                          }
                        });
              });
      log.info("Initialized Chapter 1 and Story Progress for user: {}", userId);
    }

    return user;
  }

  /**
   * 전이(Transition)가 유저의 요청과 매칭되는지 검증한다. - actionType 일치 여부 확인 - validatorType에 따라
   * exact(완전 일치) 또는
   * regex(정규식) 비교
   *
   * @param t       DB에서 조회한 전이 후보
   * @param request 유저의 액션 요청
   * @return 매칭되면 true
   */
  private boolean matchesTransition(
      StoryTransition t, TransitionRequestDto request, JsonNode latestSnapshot) {
    // 액션 타입이 다르면 즉시 불일치
    if (!t.getActionType().equals(request.getActionType())) {
      return false;
    }
    // 입력값이 없으면 매칭 불가
    if (request.getInputValue() == null)
      return false;

    // validatorType에 따라 매칭 방식 분기
    return switch (t.getValidatorType()) {
      case "exact" -> request.getInputValue().equals(t.getExpectedInput()); // 완전 일치
      case "regex" -> request.getInputValue().matches(t.getExpectedInput()); // 정규식 매칭
      case "server_rule" -> matchesServerRuleTransition(t, request, latestSnapshot);
      default -> false; // 지원하지 않는 validatorType은 매칭 실패로 처리
    };
  }

  /**
   * server_rule validator_config를 기준으로 transition 매칭 여부를 판단한다.
   *
   * @param transition     DB에서 조회한 server_rule transition
   * @param request        유저의 transition 요청
   * @param latestSnapshot 유저의 현재 진행 snapshot
   * @return server_rule이 통과하면 true
   */
  private boolean matchesServerRuleTransition(
      StoryTransition transition, TransitionRequestDto request, JsonNode latestSnapshot) {
    // transition에 저장된 validator_config JSON을 가져온다.
    JsonNode config = transition.getValidatorConfig();

    // validator_config가 없으면 어떤 server_rule도 판정할 수 없다.
    if (config == null || config.isNull() || config.isEmpty()) {
      // 설정이 비어 있는 server_rule은 매칭 실패로 처리한다.
      return false;
    }

    // 기존 Chapter 1 seed와 호환하기 위해 trigger:auto 방식을 먼저 확인한다.
    String legacyTrigger = getTextField(config, "trigger");

    // trigger:auto는 기존 system:auto 자동 전이 포맷이다.
    if ("auto".equals(legacyTrigger)) {
      // 기존 방식은 inputValue가 auto일 때만 통과한다.
      return matchesAutoInput(request);
    }

    // 신규 Chapter 2 server_rule은 validator_config.rule 값을 기준으로 분기한다.
    String rule = getTextField(config, "rule");

    // rule이 없으면 신규 server_rule을 판정할 수 없다.
    if (rule == null || rule.isBlank()) {
      // rule 누락은 매칭 실패로 처리한다.
      return false;
    }

    // Chapter 2 MVP에서 현재 코드 구조만으로 안전하게 처리 가능한 룰만 분기한다.
    return switch (rule) {
      case RULE_AUTO_SYSTEM -> matchesAutoSystemRule(request);
      case RULE_NORMALIZED_COMMAND -> matchesNormalizedCommandRule(config, request, latestSnapshot);
      case RULE_VIRTUAL_FS_COMMAND -> matchesVirtualFsCommandRule(config, request, latestSnapshot);
      case RULE_PARSED_TAR_COMMAND -> matchesParsedTarCommandRule(config, request, latestSnapshot);
      case RULE_NC_SEND_FILE -> matchesNcSendFileRule(config, request, latestSnapshot);
      case RULE_CHAINED_COMMAND -> matchesChainedCommandRule(config, request, latestSnapshot);
      default -> false;
    };
  }

  /**
   * 기존 trigger:auto 방식에서 사용하는 inputValue 조건을 검사한다.
   *
   * @param request 유저의 transition 요청
   * @return inputValue가 auto이면 true
   */
  private boolean matchesAutoInput(TransitionRequestDto request) {
    // request가 없으면 입력값을 읽을 수 없다.
    if (request == null) {
      // 요청 객체가 없으면 자동 전이를 허용하지 않는다.
      return false;
    }

    // 기존 자동 전이는 inputValue가 정확히 auto일 때만 통과한다.
    return "auto".equals(request.getInputValue());
  }

  /**
   * 신규 rule:AUTO_SYSTEM 방식에서 사용하는 자동 전이 조건을 검사한다.
   *
   * @param request 유저의 transition 요청
   * @return inputValue가 auto이면 true
   */
  private boolean matchesAutoSystemRule(TransitionRequestDto request) {
    // AUTO_SYSTEM도 기존 자동 전이와 같은 inputValue 규칙을 사용한다.
    return matchesAutoInput(request);
  }

  /**
   * NORMALIZED_COMMAND server_rule을 기준으로 명령어와 인자를 비교한다.
   *
   * @param config         transition의 validator_config JSON
   * @param request        유저의 transition 요청
   * @param latestSnapshot 유저의 현재 진행 snapshot
   * @return command와 args가 정규화 기준으로 일치하면 true
   */
  private boolean matchesNormalizedCommandRule(
      JsonNode config, TransitionRequestDto request, JsonNode latestSnapshot) {
    // request가 없으면 사용자가 입력한 명령어를 읽을 수 없다.
    if (request == null) {
      // 요청 객체가 없으면 매칭 실패로 처리한다.
      return false;
    }

    // flags 조건이 붙은 명령은 현재 snapshot이 요구 상태를 만족해야 한다.
    if (!matchesFlagRequirements(config, latestSnapshot)) {
      // 선행 행동이 완료되지 않았거나 금지 플래그가 있으면 매칭하지 않는다.
      return false;
    }

    // 사용자가 입력한 원문 command 문자열을 가져온다.
    String input = request.getInputValue();

    // 입력값이 없으면 명령어 토큰화를 할 수 없다.
    if (input == null || input.isBlank()) {
      // 빈 입력은 NORMALIZED_COMMAND에 매칭하지 않는다.
      return false;
    }

    // validator_config.command에는 기대하는 첫 번째 명령어 토큰이 들어 있다.
    String expectedCommand = getTextField(config, "command");

    // command 설정이 없으면 비교 기준이 없으므로 실패로 처리한다.
    if (expectedCommand == null || expectedCommand.isBlank()) {
      // command 누락은 seed 설정 오류에 가까우므로 매칭하지 않는다.
      return false;
    }

    // shell을 실행하지 않고, 따옴표와 공백만 고려한 lightweight tokenizer로 입력을 분해한다.
    List<String> actualTokens = tokenizeCommand(input);

    // 토큰화 결과가 없으면 비교할 명령어가 없다.
    if (actualTokens.isEmpty()) {
      // 비어 있는 토큰 목록은 매칭 실패다.
      return false;
    }

    // 첫 번째 토큰은 command 이름이어야 한다.
    if (!expectedCommand.equals(actualTokens.get(0))) {
      // command 이름이 다르면 인자를 볼 필요 없이 실패다.
      return false;
    }

    // validator_config.args 배열을 기대 인자 목록으로 읽는다.
    List<String> expectedArgs = getTextArrayField(config, "args");

    // 실제 토큰 수는 command 1개와 기대 인자 수를 합친 값과 같아야 한다.
    if (actualTokens.size() != expectedArgs.size() + 1) {
      // 인자 개수가 다르면 명령어가 정규화 기준을 만족하지 않는다.
      return false;
    }

    // 기대 인자와 실제 인자를 순서대로 비교한다.
    for (int i = 0; i < expectedArgs.size(); i++) {
      // actualTokens의 0번은 command이므로 인자는 1번부터 비교한다.
      String actualArg = actualTokens.get(i + 1);

      // validator_config.args의 현재 위치 인자를 가져온다.
      String expectedArg = expectedArgs.get(i);

      // 인자 값이 하나라도 다르면 매칭 실패다.
      if (!expectedArg.equals(actualArg)) {
        // 순서와 값이 모두 맞아야 하므로 즉시 false를 반환한다.
        return false;
      }
    }

    // command와 모든 args가 일치하면 NORMALIZED_COMMAND를 통과한다.
    return true;
  }

  /**
   * VIRTUAL_FS_COMMAND server_rule을 기준으로 파일 경로 기반 명령을 검증한다.
   *
   * @param config         transition의 validator_config JSON
   * @param request        유저의 transition 요청
   * @param latestSnapshot 유저의 현재 진행 snapshot
   * @return 명령어, resolvedPath, VFS 권한 조건이 모두 맞으면 true
   */
  private boolean matchesVirtualFsCommandRule(
      JsonNode config, TransitionRequestDto request, JsonNode latestSnapshot) {
    // flags 조건이 붙은 VFS 명령은 먼저 선행 상태를 확인한다.
    if (!matchesRulePrerequisites(config, latestSnapshot)) {
      // 선행 상태가 맞지 않으면 경로를 보지 않고 매칭 실패로 처리한다.
      return false;
    }

    // 유저 입력을 shell 실행 없이 토큰 기반 명령 객체로 파싱한다.
    ParsedCommand command = parseCommand(request.getInputValue());

    // 비어 있거나 malformed인 명령은 VFS rule로 검증할 수 없다.
    if (command == null) {
      // 입력 구조가 맞지 않으므로 false를 반환한다.
      return false;
    }

    // validator_config.command에는 cat, sh 같은 기대 명령이 들어 있다.
    String expectedCommand = getTextField(config, "command");

    // 명령어 이름이 다르면 해당 VFS transition은 대상이 아니다.
    if (!command.command().equals(expectedCommand)) {
      // 다른 명령은 우선순위가 낮은 다른 transition 또는 fallback이 처리한다.
      return false;
    }

    // cat/sh 계열 VFS rule은 첫 번째 비옵션 인자를 파일 경로로 사용한다.
    String rawPath = firstNonOptionArgument(command.args());

    // 경로 인자가 없으면 resolvedPath를 계산할 수 없다.
    if (rawPath == null) {
      // 경로 대상 명령이 아니므로 매칭 실패다.
      return false;
    }

    // 절대/상대 경로 허용 정책을 seed 설정과 맞춘다.
    if (!isPathKindAllowed(config, rawPath)) {
      // 금지된 경로 표현 방식이면 같은 파일이어도 매칭하지 않는다.
      return false;
    }

    // 현재 cwd 기준으로 입력 경로를 VFS 절대 경로로 정규화한다.
    String resolvedPath = resolveSnapshotPath(latestSnapshot, rawPath);

    // validator_config.resolvedPath가 기대하는 대상 파일이다.
    String expectedPath = getTextField(config, "resolvedPath");

    // 정규화된 입력 경로가 seed의 대상 경로와 일치해야 한다.
    if (!resolvedPath.equals(expectedPath)) {
      // 같은 명령이어도 다른 파일을 대상으로 하면 매칭 실패다.
      return false;
    }

    // 정적 VFS와 snapshot overlay를 합친 현재 VFS 컨텍스트를 만든다.
    VfsContext vfs = createVfsContext(latestSnapshot);

    // 정규화된 대상 경로가 실제 VFS에 존재하는지 확인한다.
    VfsNode node = vfs.resolve(resolvedPath);

    // 존재하지 않는 파일/디렉터리는 VFS transition 대상이 아니다.
    if (node == null) {
      // 없는 대상은 자유 터미널 fallback에서 오류 출력으로 처리될 수 있다.
      return false;
    }

    // readable 요구가 있으면 VFS node의 읽기 가능 여부를 검사한다.
    if (config.path("requiredReadable").asBoolean(false) && !node.readable()) {
      // 읽을 수 없는 파일은 cat 성공 분기로 매칭하면 안 된다.
      return false;
    }

    // executable 요구 필드가 있으면 true/false 모두 명시 조건으로 다룬다.
    if (config.has("requiredExecutable")
        && node.executable() != config.path("requiredExecutable").asBoolean()) {
      // 실행 가능 여부가 seed의 성공/실패 분기 조건과 다르면 매칭하지 않는다.
      return false;
    }

    // 모든 VFS 조건이 맞으면 해당 transition을 선택할 수 있다.
    return true;
  }

  /**
   * PARSED_TAR_COMMAND server_rule을 기준으로 tar 아카이브 생성 명령을 검증한다.
   *
   * @param config         transition의 validator_config JSON
   * @param request        유저의 transition 요청
   * @param latestSnapshot 유저의 현재 진행 snapshot
   * @return output file, 포함 파일, 금지/감지 파일 조건이 맞으면 true
   */
  private boolean matchesParsedTarCommandRule(
      JsonNode config, TransitionRequestDto request, JsonNode latestSnapshot) {
    // tar 명령은 tmp 파일 탐색 같은 선행 플래그가 만족되어야 한다.
    if (!matchesRulePrerequisites(config, latestSnapshot)) {
      // 선행 조건이 맞지 않으면 보호 코어/정상 tar 어느 쪽도 통과시키지 않는다.
      return false;
    }

    // 유저 입력을 tar 전용 구조로 파싱한다.
    ParsedTarCommand tarCommand = parseTarCommand(request.getInputValue());

    // tar 구조가 아니면 PARSED_TAR_COMMAND 대상이 아니다.
    if (tarCommand == null) {
      // 다른 명령은 매칭 실패로 처리한다.
      return false;
    }

    // validator_config.outputFile에는 decoy.tar 같은 생성 파일명이 들어 있다.
    String expectedOutputFile = getTextField(config, "outputFile");

    // 출력 파일명이 기대값과 맞아야 한다.
    if (!matchesOutputFile(tarCommand.outputFile(), expectedOutputFile, latestSnapshot)) {
      // 다른 아카이브명을 만들면 이 transition은 통과하지 않는다.
      return false;
    }

    // 입력 파일 경로들을 현재 cwd 기준 절대 경로로 변환한다.
    List<String> resolvedFiles = resolvePaths(latestSnapshot, tarCommand.inputFiles());

    // requiredFiles는 순서와 무관하게 모두 포함되어야 한다.
    if (!containsAllPaths(resolvedFiles, getTextArrayField(config, "requiredFiles"))) {
      // 필수 tmp 파일이 빠졌으면 정상/실패 어느 분기도 성립하지 않는다.
      return false;
    }

    // protectedFileIncluded 분기는 detectedFiles가 포함된 경우를 명시적으로 잡는다.
    if (config.path("protectedFileIncluded").asBoolean(false)
        && !containsAllPaths(resolvedFiles, getTextArrayField(config, "detectedFiles"))) {
      // 보호 코어 포함 실패 분기는 감지 파일이 실제 입력에 있어야 통과한다.
      return false;
    }

    // forbiddenFiles는 정상 decoy 생성 분기에서 포함되면 안 되는 파일 목록이다.
    if (containsAnyPath(resolvedFiles, getTextArrayField(config, "forbiddenFiles"))) {
      // 보호 파일이 섞였으면 정상 tar 분기는 선택하면 안 된다.
      return false;
    }

    // tar 전용 조건을 모두 만족하면 해당 transition을 선택한다.
    return true;
  }

  /**
   * NC_SEND_FILE server_rule을 기준으로 nc 전송 명령을 검증한다.
   *
   * @param config         transition의 validator_config JSON
   * @param request        유저의 transition 요청
   * @param latestSnapshot 유저의 현재 진행 snapshot
   * @return host/port/timeout/stdinFile 조건이 맞으면 true
   */
  private boolean matchesNcSendFileRule(
      JsonNode config, TransitionRequestDto request, JsonNode latestSnapshot) {
    // decoy 생성 같은 선행 상태와 created file 존재를 먼저 확인한다.
    if (!matchesRulePrerequisites(config, latestSnapshot)) {
      // 전송 대상 파일이 아직 없으면 nc 명령은 매칭하지 않는다.
      return false;
    }

    // 유저 입력을 일반 명령 객체로 파싱한다.
    ParsedCommand command = parseCommand(request.getInputValue());

    // nc 명령이 아니면 이 rule의 대상이 아니다.
    if (command == null || !"nc".equals(command.command())) {
      // 다른 command는 매칭 실패다.
      return false;
    }

    // nc 인자에서 timeout, host, port, stdin redirect를 추출한다.
    ParsedNcCommand ncCommand = parseNcCommand(command.args());

    // nc 필수 구조가 없으면 검증할 수 없다.
    if (ncCommand == null) {
      // 잘못된 nc 입력은 매칭 실패로 처리한다.
      return false;
    }

    // timeoutSeconds가 seed와 일치해야 한다.
    if (ncCommand.timeoutSeconds() != config.path("timeoutSeconds").asInt()) {
      // timeout 값이 다르면 전송 command로 인정하지 않는다.
      return false;
    }

    // host가 seed와 일치해야 한다.
    if (!ncCommand.host().equals(getTextField(config, "host"))) {
      // 다른 host로 보내는 명령은 매칭 실패다.
      return false;
    }

    // port가 seed와 일치해야 한다.
    if (ncCommand.port() != config.path("port").asInt()) {
      // 다른 port는 의도한 전송 대상이 아니다.
      return false;
    }

    // stdin redirection 파일을 현재 cwd 기준 절대 경로로 정규화한다.
    String resolvedStdinFile = resolveSnapshotPath(latestSnapshot, ncCommand.stdinFile());

    // 정규화된 stdin 파일이 seed의 stdinFile과 일치해야 한다.
    if (!resolvedStdinFile.equals(getTextField(config, "stdinFile"))) {
      // 다른 파일을 전송하면 decoy 전송으로 인정하지 않는다.
      return false;
    }

    // 현재 VFS에서 stdin 파일이 존재해야 한다.
    if (createVfsContext(latestSnapshot).resolve(resolvedStdinFile) == null) {
      // overlay에 생성된 파일이 없으면 전송할 수 없다.
      return false;
    }

    // 모든 nc 조건이 맞으면 transition을 선택한다.
    return true;
  }

  /**
   * CHAINED_COMMAND server_rule을 기준으로 연결 명령의 순서와 인자를 검증한다.
   *
   * @param config         transition의 validator_config JSON
   * @param request        유저의 transition 요청
   * @param latestSnapshot 유저의 현재 진행 snapshot
   * @return operator와 하위 command들이 모두 맞으면 true
   */
  private boolean matchesChainedCommandRule(
      JsonNode config, TransitionRequestDto request, JsonNode latestSnapshot) {
    // decoy 전송 등 선행 상태와 created file 조건을 먼저 확인한다.
    if (!matchesRulePrerequisites(config, latestSnapshot)) {
      // 선행 조건이 없으면 흔적 삭제 명령으로 인정하지 않는다.
      return false;
    }

    // validator_config.operator에는 && 같은 연결 연산자가 들어 있다.
    String operator = getTextField(config, "operator");

    // operator가 없거나 입력이 없으면 연결 명령을 분해할 수 없다.
    if (operator == null || request.getInputValue() == null) {
      // 설정 또는 입력이 부족하므로 매칭 실패다.
      return false;
    }

    // raw input을 operator 기준으로 분리한다.
    String[] rawCommands = request
        .getInputValue()
        .split("\\s*" + java.util.regex.Pattern.quote(operator) + "\\s*", -1);

    // validator_config.commands는 기대 command 목록이다.
    JsonNode expectedCommands = config.get("commands");

    // 기대 command가 배열이 아니면 seed 설정이 잘못된 것이다.
    if (expectedCommands == null || !expectedCommands.isArray()) {
      // 검증 기준이 없으므로 실패로 처리한다.
      return false;
    }

    // 입력 command 수와 기대 command 수가 같아야 한다.
    if (rawCommands.length != expectedCommands.size()) {
      // 순서와 개수를 엄격히 본다.
      return false;
    }

    // 각 하위 command를 순서대로 검증한다.
    // operator 앞뒤에 빈 command가 있으면 shell 문법상 불완전한 chained command다.
    for (String rawCommand : rawCommands) {
      // trailing && 같은 입력은 limit=-1 split으로 잡아낸다.
      if (rawCommand == null || rawCommand.isBlank()) {
        // 빈 하위 command가 있으면 전체 chained command를 거부한다.
        return false;
      }
    }

    for (int i = 0; i < expectedCommands.size(); i++) {
      // 현재 위치의 기대 command config를 꺼낸다.
      JsonNode expectedCommand = expectedCommands.get(i);

      // 현재 위치의 raw command를 일반 명령 객체로 파싱한다.
      ParsedCommand actualCommand = parseCommand(rawCommands[i]);

      // 하위 command가 기대 config와 맞지 않으면 전체 chained command가 실패한다.
      if (!matchesConfiguredSubCommand(expectedCommand, actualCommand, latestSnapshot)) {
        // 순서가 바뀌거나 인자가 다르면 통과하지 않는다.
        return false;
      }
    }

    // 모든 하위 command가 순서대로 일치하면 transition을 선택한다.
    return true;
  }

  /**
   * validator_config에서 문자열 필드를 안전하게 읽는다.
   *
   * @param node      값을 읽을 JSON node
   * @param fieldName 읽을 필드명
   * @return 문자열 필드가 있으면 값, 없으면 null
   */
  private String getTextField(JsonNode node, String fieldName) {
    // node가 없으면 필드를 읽을 수 없다.
    if (node == null || node.isNull()) {
      // 호출자가 누락 상태를 구분할 수 있도록 null을 반환한다.
      return null;
    }

    // 지정한 필드명을 기준으로 하위 node를 가져온다.
    JsonNode value = node.get(fieldName);

    // 필드가 없거나 null이면 문자열 값도 없다.
    if (value == null || value.isNull()) {
      // 없는 필드는 null로 표현한다.
      return null;
    }

    // 문자열 필드만 server_rule 설정값으로 인정한다.
    if (!value.isTextual()) {
      // 문자열이 아니면 잘못된 설정으로 보고 null을 반환한다.
      return null;
    }

    // 앞뒤 공백은 설정 실수에 가깝기 때문에 제거한 값을 반환한다.
    return value.asText().trim();
  }

  /**
   * validator_config에서 문자열 배열 필드를 안전하게 읽는다.
   *
   * @param node      값을 읽을 JSON node
   * @param fieldName 읽을 배열 필드명
   * @return 문자열 값만 포함한 배열, 필드가 없으면 빈 배열
   */
  private List<String> getTextArrayField(JsonNode node, String fieldName) {
    // node가 없으면 배열 필드를 읽을 수 없다.
    if (node == null || node.isNull()) {
      // args가 없는 것과 동일하게 빈 목록을 반환한다.
      return List.of();
    }

    // 지정한 필드명을 기준으로 하위 node를 가져온다.
    JsonNode value = node.get(fieldName);

    // 필드가 없거나 null이면 빈 인자 목록으로 처리한다.
    if (value == null || value.isNull()) {
      // 인자가 없는 명령어와 비교할 수 있도록 빈 목록을 반환한다.
      return List.of();
    }

    // 배열이 아니면 설정 형식이 맞지 않으므로 매칭되지 않게 빈 목록을 반환한다.
    if (!value.isArray()) {
      // 잘못된 args 형식은 인자 없음으로 다룬다.
      return List.of();
    }

    // 문자열 배열 값을 담을 결과 목록을 생성한다.
    List<String> values = new ArrayList<>();

    // args 배열의 각 원소를 순회한다.
    for (JsonNode item : value) {
      // 문자열 원소만 정상 args 값으로 인정한다.
      if (item != null && item.isTextual()) {
        // 비교 시 설정 주변 공백을 제거한 값을 사용한다.
        values.add(item.asText().trim());
      }
    }

    // 수집한 문자열 args 목록을 반환한다.
    return values;
  }

  /**
   * 명령어 문자열을 공백 기준 토큰으로 나누되 따옴표 내부 공백은 보존한다.
   *
   * @param input 사용자가 입력한 명령어 문자열
   * @return 토큰화된 명령어/인자 목록
   */
  private List<String> tokenizeCommand(String input) {
    // 결과 토큰을 순서대로 담을 목록을 생성한다.
    List<String> tokens = new ArrayList<>();

    // 현재 읽고 있는 토큰 문자를 누적한다.
    StringBuilder current = new StringBuilder();

    // 작은따옴표 내부에 있는지 추적한다.
    boolean inSingleQuote = false;

    // 큰따옴표 내부에 있는지 추적한다.
    boolean inDoubleQuote = false;

    // 직전 문자가 escape 문자였는지 추적한다.
    boolean escaped = false;

    // 입력 문자열을 한 글자씩 순회한다.
    for (int i = 0; i < input.length(); i++) {
      // 현재 위치의 문자를 읽는다.
      char ch = input.charAt(i);

      // 직전 문자가 escape였다면 현재 문자는 그대로 토큰에 포함한다.
      if (escaped) {
        // escape된 문자를 현재 토큰에 추가한다.
        current.append(ch);

        // escape 처리를 끝냈으므로 상태를 해제한다.
        escaped = false;

        // 현재 문자는 처리 완료되었으므로 다음 문자로 이동한다.
        continue;
      }

      // 작은따옴표 안이 아닐 때만 backslash escape를 인정한다.
      if (ch == '\\' && !inSingleQuote) {
        // 다음 문자를 그대로 포함하기 위해 escape 상태를 켠다.
        escaped = true;

        // backslash 자체는 토큰에 넣지 않는다.
        continue;
      }

      // 큰따옴표 안이 아닐 때 작은따옴표는 quoting 상태를 토글한다.
      if (ch == '\'' && !inDoubleQuote) {
        // 작은따옴표 quoting 상태를 반전한다.
        inSingleQuote = !inSingleQuote;

        // 따옴표 문자는 토큰 값에는 포함하지 않는다.
        continue;
      }

      // 작은따옴표 안이 아닐 때 큰따옴표는 quoting 상태를 토글한다.
      if (ch == '"' && !inSingleQuote) {
        // 큰따옴표 quoting 상태를 반전한다.
        inDoubleQuote = !inDoubleQuote;

        // 따옴표 문자는 토큰 값에는 포함하지 않는다.
        continue;
      }

      // quoting 밖의 공백은 토큰 구분자로 사용한다.
      if (Character.isWhitespace(ch) && !inSingleQuote && !inDoubleQuote) {
        // 현재 토큰에 문자가 있으면 하나의 토큰으로 확정한다.
        if (current.length() > 0) {
          // 누적된 토큰을 결과 목록에 추가한다.
          tokens.add(current.toString());

          // 다음 토큰을 받을 수 있도록 버퍼를 비운다.
          current.setLength(0);
        }

        // 연속 공백은 하나의 구분자로 취급하므로 다음 문자로 이동한다.
        continue;
      }

      // 일반 문자는 현재 토큰에 그대로 추가한다.
      current.append(ch);
    }

    // 입력이 backslash로 끝난 경우에는 사용자가 입력한 backslash를 보존한다.
    if (escaped) {
      // 마지막 escape 문자를 토큰에 추가한다.
      current.append('\\');
    }

    // 따옴표가 닫히지 않은 입력은 정상 명령어로 보지 않는다.
    if (inSingleQuote || inDoubleQuote) {
      // malformed input은 어떤 server_rule에도 매칭하지 않도록 빈 목록을 반환한다.
      return List.of();
    }

    // 마지막 토큰에 문자가 남아 있으면 결과 목록에 추가한다.
    if (current.length() > 0) {
      // 마지막 토큰을 결과 목록에 추가한다.
      tokens.add(current.toString());
    }

    // 완성된 토큰 목록을 반환한다.
    return tokens;
  }

  /** PARSED_TAR_COMMAND 검증에 필요한 tar 명령 구조입니다. */
  private record ParsedTarCommand(String outputFile, List<String> inputFiles) {
  }

  /** NC_SEND_FILE 검증에 필요한 nc 명령 구조입니다. */
  private record ParsedNcCommand(int timeoutSeconds, String host, int port, String stdinFile) {
  }

  /**
   * server_rule 공통 선행 조건을 검사한다.
   *
   * @param config         transition의 validator_config JSON
   * @param latestSnapshot 유저의 현재 진행 snapshot
   * @return required/forbidden flag와 created file 조건이 모두 맞으면 true
   */
  private boolean matchesRulePrerequisites(JsonNode config, JsonNode latestSnapshot) {
    // requiredFlags와 forbiddenFlags 조건을 먼저 검사한다.
    if (!matchesFlagRequirements(config, latestSnapshot)) {
      // 플래그 조건이 맞지 않으면 해당 rule을 더 검증하지 않는다.
      return false;
    }

    // requiredCreatedFiles 조건을 검사한다.
    if (!matchesCreatedFileRequirements(config, latestSnapshot)) {
      // 필요한 동적 생성 파일이 없거나 삭제되었으면 매칭하지 않는다.
      return false;
    }

    // 공통 선행 조건을 모두 만족했다.
    return true;
  }

  /**
   * validator_config의 requiredFlags / forbiddenFlags 조건을 검사한다.
   *
   * @param config         transition의 validator_config JSON
   * @param latestSnapshot 유저의 현재 진행 snapshot
   * @return 플래그 조건을 만족하면 true
   */
  private boolean matchesFlagRequirements(JsonNode config, JsonNode latestSnapshot) {
    // snapshot.flags 객체를 가져온다.
    JsonNode flags = latestSnapshot == null ? null : latestSnapshot.path("flags");

    // requiredFlags에 적힌 모든 플래그가 true인지 확인한다.
    for (String requiredFlag : getTextArrayField(config, "requiredFlags")) {
      // 하나라도 true가 아니면 선행 행동이 완료되지 않은 상태다.
      if (flags == null || !flags.path(requiredFlag).asBoolean(false)) {
        // 필수 플래그 미충족으로 매칭 실패다.
        return false;
      }
    }

    // forbiddenFlags에 적힌 플래그가 true이면 안 된다.
    for (String forbiddenFlag : getTextArrayField(config, "forbiddenFlags")) {
      // 금지 플래그가 true이면 해당 transition은 선택하면 안 된다.
      if (flags != null && flags.path(forbiddenFlag).asBoolean(false)) {
        // 금지 상태가 감지되었으므로 매칭 실패다.
        return false;
      }
    }

    // 모든 플래그 조건을 만족했다.
    return true;
  }

  /**
   * validator_config.requiredCreatedFiles 조건을 검사한다.
   *
   * @param config         transition의 validator_config JSON
   * @param latestSnapshot 유저의 현재 진행 snapshot
   * @return 필요한 동적 생성 파일이 현재 overlay에 남아 있으면 true
   */
  private boolean matchesCreatedFileRequirements(JsonNode config, JsonNode latestSnapshot) {
    // requiredCreatedFiles 배열을 가져온다.
    List<String> requiredFiles = getTextArrayField(config, "requiredCreatedFiles");

    // 요구 파일이 없으면 별도 검사 없이 통과한다.
    if (requiredFiles.isEmpty()) {
      // created file 선행 조건이 없는 rule이다.
      return true;
    }

    // 각 requiredCreatedFiles가 active created node인지 확인한다.
    for (String requiredFile : requiredFiles) {
      // overlay에 없거나 removedPaths에 있으면 조건을 만족하지 못한다.
      if (!isActiveCreatedPath(latestSnapshot, requiredFile)) {
        // 필요한 동적 파일이 없으므로 매칭 실패다.
        return false;
      }
    }

    // 모든 requiredCreatedFiles가 active 상태다.
    return true;
  }

  /**
   * snapshot overlay에 특정 created path가 현재 유효하게 존재하는지 확인한다.
   *
   * @param snapshot 유저의 현재 진행 snapshot
   * @param path     확인할 절대 경로
   * @return createdNodes에 있고 removedPaths에 없으면 true
   */
  private boolean isActiveCreatedPath(JsonNode snapshot, String path) {
    // 제거된 path는 createdNodes에 남아 있어도 더 이상 유효하지 않다.
    if (isRemovedPath(snapshot, path)) {
      // 삭제된 파일은 active created file이 아니다.
      return false;
    }

    // createdNodes 배열을 가져온다.
    JsonNode createdNodes = snapshot == null ? null : snapshot.path("vfsOverlay").path("createdNodes");

    // createdNodes가 배열이 아니면 동적 생성 파일이 없다.
    if (createdNodes == null || !createdNodes.isArray()) {
      // 생성된 overlay 파일이 없으므로 false다.
      return false;
    }

    // createdNodes 안에서 같은 path를 찾는다.
    for (JsonNode createdNode : createdNodes) {
      // path 필드가 일치하면 현재 생성된 파일로 인정한다.
      if (path.equals(createdNode.path("path").asText())) {
        // matching created node를 찾았다.
        return true;
      }
    }

    // matching created node가 없다.
    return false;
  }

  /**
   * snapshot overlay에서 path가 removedPaths에 포함되어 있는지 확인한다.
   *
   * @param snapshot 유저의 현재 진행 snapshot
   * @param path     확인할 절대 경로
   * @return removedPaths에 있으면 true
   */
  private boolean isRemovedPath(JsonNode snapshot, String path) {
    // removedPaths 배열을 가져온다.
    JsonNode removedPaths = snapshot == null ? null : snapshot.path("vfsOverlay").path("removedPaths");

    // removedPaths가 배열이 아니면 삭제된 path가 없다.
    if (removedPaths == null || !removedPaths.isArray()) {
      // 삭제 목록이 없으므로 false다.
      return false;
    }

    // removedPaths 배열에서 같은 path를 찾는다.
    for (JsonNode removedPath : removedPaths) {
      // textual path 값이 일치하면 삭제된 상태다.
      if (removedPath.isTextual() && path.equals(removedPath.asText())) {
        // 삭제 목록에 포함되어 있다.
        return true;
      }
    }

    // 삭제 목록에 없다.
    return false;
  }

  /**
   * 첫 번째 비옵션 인자를 파일 경로 후보로 반환한다.
   *
   * @param args 파싱된 명령 인자 목록
   * @return 경로 후보 인자, 없으면 null
   */
  private String firstNonOptionArgument(List<String> args) {
    // 인자 목록을 순서대로 확인한다.
    for (String arg : args) {
      // 옵션처럼 시작하는 인자는 경로 후보에서 제외한다.
      if (!arg.startsWith("-")) {
        // 첫 번째 비옵션 인자를 반환한다.
        return arg;
      }
    }

    // 경로 후보가 없다.
    return null;
  }

  /**
   * 입력 경로가 validator_config의 절대/상대 경로 허용 정책을 만족하는지 확인한다.
   *
   * @param config  transition의 validator_config JSON
   * @param rawPath 유저가 입력한 원문 경로
   * @return 허용된 경로 표현이면 true
   */
  private boolean isPathKindAllowed(JsonNode config, String rawPath) {
    // /로 시작하는 경로는 절대 경로로 본다.
    boolean absolute = rawPath.startsWith("/");

    // 절대 경로인데 allowAbsolutePath가 false이면 거부한다.
    if (absolute
        && config.has("allowAbsolutePath")
        && !config.path("allowAbsolutePath").asBoolean()) {
      // seed 정책상 절대 경로가 금지되어 있다.
      return false;
    }

    // 상대 경로인데 allowRelativePath가 false이면 거부한다.
    if (!absolute
        && config.has("allowRelativePath")
        && !config.path("allowRelativePath").asBoolean()) {
      // seed 정책상 상대 경로가 금지되어 있다.
      return false;
    }

    // 경로 표현 방식이 허용된다.
    return true;
  }

  /**
   * 현재 snapshot의 cwd 기준으로 입력 경로를 VFS 절대 경로로 정규화한다.
   *
   * @param latestSnapshot 유저의 현재 진행 snapshot
   * @param rawPath        유저가 입력한 경로
   * @return 정규화된 VFS 절대 경로
   */
  private String resolveSnapshotPath(JsonNode latestSnapshot, String rawPath) {
    // snapshot에서 현재 cwd를 읽는다.
    String cwd = extractText(latestSnapshot, "/terminal/cwd");

    // cwd가 없으면 Chapter 2 기본 cwd를 사용한다.
    if (cwd == null || cwd.isBlank()) {
      // 초기 snapshot 또는 잘못된 snapshot에 대한 fallback이다.
      cwd = CHAPTER_02_DEFAULT_CWD;
    }

    // 정적 VFS의 rootPath를 가져온다.
    String rootPath = createVfsContext(latestSnapshot).getRootPath();

    // PathResolver를 사용해 루트 이탈을 막은 절대 경로로 변환한다.
    return pathResolver.resolve(cwd, rawPath, rootPath);
  }

  /**
   * 여러 입력 경로를 현재 snapshot 기준 VFS 절대 경로로 정규화한다.
   *
   * @param latestSnapshot 유저의 현재 진행 snapshot
   * @param rawPaths       원문 경로 목록
   * @return 정규화된 절대 경로 목록
   */
  private List<String> resolvePaths(JsonNode latestSnapshot, List<String> rawPaths) {
    // 정규화 결과를 입력 순서대로 담는다.
    List<String> resolvedPaths = new ArrayList<>();

    // 각 원문 경로를 순회한다.
    for (String rawPath : rawPaths) {
      // 현재 snapshot cwd 기준 절대 경로로 변환해 추가한다.
      resolvedPaths.add(resolveSnapshotPath(latestSnapshot, rawPath));
    }

    // 정규화된 경로 목록을 반환한다.
    return resolvedPaths;
  }

  /**
   * 현재 snapshot에 대한 VFS 컨텍스트를 생성한다.
   *
   * @param latestSnapshot 유저의 현재 진행 snapshot
   * @return 정적 VFS와 overlay를 병합해 조회하는 VfsContext
   */
  private VfsContext createVfsContext(JsonNode latestSnapshot) {
    // snapshot에 vfsOverlay가 있으면 해당 값을 사용한다.
    JsonNode overlay = latestSnapshot == null
        ? objectMapper.createObjectNode()
        : latestSnapshot.path("vfsOverlay");

    // chapter02Vfs가 로드되지 않았을 때도 NPE가 나지 않도록 빈 객체를 fallback으로 둔다.
    JsonNode staticVfs = chapter02Vfs == null ? objectMapper.createObjectNode() : chapter02Vfs;

    // VfsContext가 정적 VFS와 overlay를 함께 보도록 구성한다.
    return VfsContext.of(staticVfs, overlay);
  }

  /**
   * resolved path 목록이 required path를 모두 포함하는지 검사한다.
   *
   * @param actualPaths   실제 입력에서 정규화한 경로 목록
   * @param requiredPaths 반드시 포함되어야 하는 경로 목록
   * @return requiredPaths가 모두 포함되어 있으면 true
   */
  private boolean containsAllPaths(List<String> actualPaths, List<String> requiredPaths) {
    // requiredPaths가 비어 있으면 항상 통과한다.
    if (requiredPaths.isEmpty()) {
      // 필수 경로 조건이 없는 rule이다.
      return true;
    }

    // 실제 경로 목록이 모든 필수 경로를 포함하는지 확인한다.
    return actualPaths.containsAll(requiredPaths);
  }

  /**
   * resolved path 목록이 금지 path를 하나라도 포함하는지 검사한다.
   *
   * @param actualPaths    실제 입력에서 정규화한 경로 목록
   * @param forbiddenPaths 포함되면 안 되는 경로 목록
   * @return 금지 경로가 하나라도 있으면 true
   */
  private boolean containsAnyPath(List<String> actualPaths, List<String> forbiddenPaths) {
    // 금지 경로 목록을 순회한다.
    for (String forbiddenPath : forbiddenPaths) {
      // 실제 입력에 금지 경로가 있으면 true다.
      if (actualPaths.contains(forbiddenPath)) {
        // 금지 경로가 발견되었다.
        return true;
      }
    }

    // 금지 경로가 없다.
    return false;
  }

  /**
   * tar 출력 파일명이 validator_config.outputFile 조건과 맞는지 검사한다.
   *
   * @param rawOutputFile      유저가 입력한 tar 출력 파일 경로
   * @param expectedOutputFile validator_config의 outputFile
   * @param latestSnapshot     유저의 현재 진행 snapshot
   * @return 파일명이 맞으면 true
   */
  private boolean matchesOutputFile(
      String rawOutputFile, String expectedOutputFile, JsonNode latestSnapshot) {
    // 기대 outputFile이 없으면 검증 기준이 없다.
    if (expectedOutputFile == null || expectedOutputFile.isBlank()) {
      // seed 설정 오류에 가까우므로 매칭 실패로 처리한다.
      return false;
    }

    // 입력값이 기대 파일명과 그대로 같으면 통과한다.
    // 절대 경로 기대값은 유저 입력 원문과 완전히 같을 때만 바로 통과시킵니다.
    if (expectedOutputFile.startsWith("/") && expectedOutputFile.equals(rawOutputFile)) {
      // 가장 일반적인 decoy.tar 입력이다.
      return true;
    }

    // 출력 파일 경로를 현재 cwd 기준 절대 경로로 정규화한다.
    String resolvedOutputFile = resolveSnapshotPath(latestSnapshot, rawOutputFile);

    // 기대값이 절대 경로로 들어온 경우 정규화 경로와 직접 비교한다.
    if (expectedOutputFile.startsWith("/")) {
      // 절대 outputFile 정책을 지원한다.
      return expectedOutputFile.equals(resolvedOutputFile);
    }

    // 기대값이 파일명인 경우 정규화 경로의 마지막 세그먼트와 비교한다.
    // 상대 파일명 기대값은 Chapter 2 기본 cwd에서 생성되는 실제 절대 경로와 비교합니다.
    return pathResolver
        .resolve(
            CHAPTER_02_DEFAULT_CWD,
            expectedOutputFile,
            createVfsContext(latestSnapshot).getRootPath())
        .equals(resolvedOutputFile);
  }

  /**
   * raw input을 tar 명령 구조로 파싱한다.
   *
   * @param input 유저가 입력한 원문 command
   * @return tar 구조가 맞으면 ParsedTarCommand, 아니면 null
   */
  private ParsedTarCommand parseTarCommand(String input) {
    // 일반 명령 tokenizer로 command와 args를 먼저 분리한다.
    ParsedCommand command = parseCommand(input);

    // tar 명령이 아니면 null을 반환한다.
    if (command == null || !"tar".equals(command.command())) {
      // PARSED_TAR_COMMAND 대상이 아니다.
      return null;
    }

    // tar -cvf decoy.tar ... 형태에서 output file 위치를 찾는다.
    int outputFileIndex = -1;

    // tar listing/extract 명령이 decoy 생성 전이를 통과하지 않도록 create 옵션을 추적한다.
    boolean createOptionSeen = false;

    // tar 옵션 목록을 순회한다.
    for (int i = 0; i < command.args().size(); i++) {
      // 현재 인자를 가져온다.
      String arg = command.args().get(i);

      // -cvf, -cf, -f처럼 f 옵션을 포함한 옵션 뒤의 값이 output file이다.
      // 옵션이 아닌 인자는 파일 목록 구간으로 보고 tar 옵션 해석에서 제외한다.
      if (!arg.startsWith("-")) {
        // 다음 인자로 넘어간다.
        continue;
      }

      // c 옵션이 포함되어야 실제 archive 생성 명령으로 인정한다.
      if (arg.contains("c")) {
        // 생성 옵션을 확인했다.
        createOptionSeen = true;
      }

      // f 옵션이 포함된 옵션 뒤의 값이 output archive 경로다.
      if (arg.contains("f")) {
        // output file은 f 옵션 바로 다음 토큰이다.
        outputFileIndex = i + 1;

        // 첫 번째 f 옵션을 기준으로 파싱을 끝낸다.
        break;
      }
    }

    // output file 위치가 없거나 범위를 벗어나면 tar 생성 명령으로 볼 수 없다.
    // create 옵션이 없으면 Chapter 2 decoy archive 생성 명령이 아니다.
    if (!createOptionSeen) {
      // tar 조회/추출 명령은 story 전이를 통과시키지 않는다.
      return null;
    }

    if (outputFileIndex <= 0 || outputFileIndex >= command.args().size()) {
      // decoy.tar를 만들 위치가 없으므로 null이다.
      return null;
    }

    // output file 토큰을 읽는다.
    String outputFile = command.args().get(outputFileIndex);

    // output file 뒤의 나머지 토큰은 입력 파일 목록이다.
    List<String> inputFiles = command.args().subList(outputFileIndex + 1, command.args().size());

    // 입력 파일이 없으면 decoy 생성 명령으로 볼 수 없다.
    if (inputFiles.isEmpty()) {
      // 아카이브에 담을 파일이 없으므로 null이다.
      return null;
    }

    // tar 검증에 필요한 구조를 반환한다.
    return new ParsedTarCommand(outputFile, new ArrayList<>(inputFiles));
  }

  /**
   * nc 인자 목록을 전송 검증 구조로 파싱한다.
   *
   * @param args nc 명령 뒤의 인자 목록
   * @return nc 구조가 맞으면 ParsedNcCommand, 아니면 null
   */
  private ParsedNcCommand parseNcCommand(List<String> args) {
    // -w 옵션 값을 저장한다.
    Integer timeoutSeconds = null;

    // host/port 후보를 순서대로 담는다.
    List<String> positionals = new ArrayList<>();

    // stdin redirect 대상 파일을 저장한다.
    String stdinFile = null;

    // nc 인자를 순회한다.
    for (int i = 0; i < args.size(); i++) {
      // 현재 토큰을 가져온다.
      String arg = args.get(i);

      // -w 다음 토큰은 timeout seconds다.
      if ("-w".equals(arg) && i + 1 < args.size()) {
        // timeout 값을 정수로 파싱한다.
        timeoutSeconds = parseInteger(args.get(++i));

        // 다음 인자로 이동한다.
        continue;
      }

      // < 다음 토큰은 stdin redirection 파일이다.
      // Chapter 2 seed에서 허용하지 않은 nc 옵션은 매칭하지 않는다.
      if (arg.startsWith("-")) {
        // 알 수 없는 옵션이 섞이면 의도한 전송 명령이 아니다.
        return null;
      }

      if ("<".equals(arg) && i + 1 < args.size()) {
        // stdin 파일 경로를 저장한다.
        stdinFile = args.get(++i);

        // 다음 인자로 이동한다.
        continue;
      }

      // 옵션/리다이렉션이 아닌 값은 host/port 후보로 저장한다.
      // <file처럼 redirection과 파일 경로가 붙은 입력을 처리한다.
      if (arg.startsWith("<") && arg.length() > 1) {
        // < 뒤쪽 문자열을 stdin 파일 경로로 사용한다.
        stdinFile = arg.substring(1);

        // redirection 토큰 처리를 끝낸다.
        continue;
      }

      // 8080<decoy.tar처럼 port와 redirection이 붙은 입력을 처리한다.
      int redirectIndex = arg.indexOf('<');
      if (redirectIndex > 0) {
        // < 앞쪽 값은 host/port 후보로 사용한다.
        String beforeRedirect = arg.substring(0, redirectIndex);

        // < 뒤쪽 값은 stdin 파일 후보로 사용한다.
        String afterRedirect = arg.substring(redirectIndex + 1);

        // 앞쪽 값이 비어 있지 않으면 위치 인자로 반영한다.
        if (!beforeRedirect.isBlank()) {
          // 예: 8080<decoy.tar 에서 8080을 port 후보로 넣는다.
          positionals.add(beforeRedirect);
        }

        // 뒤쪽 값이 비어 있지 않으면 stdin 파일로 반영한다.
        if (!afterRedirect.isBlank()) {
          // 예: 8080<decoy.tar 에서 decoy.tar를 stdin 파일로 넣는다.
          stdinFile = afterRedirect;
        }

        // 붙은 redirection 토큰 처리를 끝낸다.
        continue;
      }

      positionals.add(arg);
    }

    // timeout, host, port, stdinFile이 모두 있어야 한다.
    if (timeoutSeconds == null || positionals.size() != 2 || stdinFile == null) {
      // nc 전송 명령 구조가 불완전하다.
      return null;
    }

    // port를 정수로 파싱한다.
    Integer port = parseInteger(positionals.get(1));

    // port 파싱에 실패하면 null이다.
    if (port == null) {
      // 숫자 port가 아니므로 검증할 수 없다.
      return null;
    }

    // nc 검증에 필요한 구조를 반환한다.
    return new ParsedNcCommand(timeoutSeconds, positionals.get(0), port, stdinFile);
  }

  /**
   * 문자열을 정수로 안전하게 변환한다.
   *
   * @param value 정수 문자열 후보
   * @return 파싱 성공 시 Integer, 실패 시 null
   */
  private Integer parseInteger(String value) {
    // 숫자 변환 중 예외가 나면 null로 처리한다.
    try {
      // 문자열을 정수로 변환한다.
      return Integer.parseInt(value);
    } catch (NumberFormatException e) {
      // 숫자가 아닌 값은 null로 반환한다.
      return null;
    }
  }

  /**
   * CHAINED_COMMAND의 하위 command가 기대 config와 일치하는지 검사한다.
   *
   * @param expectedCommand 기대 하위 command 설정
   * @param actualCommand   유저가 입력한 하위 command
   * @param latestSnapshot  유저의 현재 진행 snapshot
   * @return command/args/resolvedPath 조건이 일치하면 true
   */
  private boolean matchesConfiguredSubCommand(
      JsonNode expectedCommand, ParsedCommand actualCommand, JsonNode latestSnapshot) {
    // 파싱 실패한 하위 command는 매칭할 수 없다.
    if (actualCommand == null) {
      // malformed command다.
      return false;
    }

    // 기대 command 이름을 읽는다.
    String expectedCommandName = getTextField(expectedCommand, "command");

    // command 이름이 다르면 실패다.
    if (!actualCommand.command().equals(expectedCommandName)) {
      // 다른 command는 해당 위치에 올 수 없다.
      return false;
    }

    // resolvedPath 조건이 있으면 첫 번째 비옵션 인자를 경로로 검증한다.
    String expectedPath = getTextField(expectedCommand, "resolvedPath");

    // resolvedPath가 설정된 하위 command인지 확인한다.
    if (expectedPath != null) {
      // 실제 경로 인자 후보를 읽는다.
      String rawPath = firstNonOptionArgument(actualCommand.args());

      // 경로 인자가 없으면 실패다.
      if (rawPath == null) {
        // rm 대상 파일이 없는 경우다.
        return false;
      }

      // 현재 cwd 기준 정규화 경로와 기대 경로를 비교한다.
      return expectedPath.equals(resolveSnapshotPath(latestSnapshot, rawPath));
    }

    // args 조건이 있으면 순서와 값을 그대로 비교한다.
    List<String> expectedArgs = getTextArrayField(expectedCommand, "args");

    // expected args가 비어 있으면 command 이름만으로 통과한다.
    if (expectedArgs.isEmpty()) {
      // 추가 조건이 없다.
      return true;
    }

    // 하위 command 인자 목록이 기대 목록과 정확히 같아야 한다.
    return actualCommand.args().equals(expectedArgs);
  }

  /**
   * story transition 결과를 프론트엔드 응답 DTO로 변환합니다.
   *
   * <p>
   * 이동 대상 노드 정보, transition effect 목록, 갱신된 snapshot, result 코드를 한 응답에 묶습니다.
   * Chapter 2에서는 프론트가
   * snapshot과 effects를 함께 받아 터미널/브라우저/스토리 런타임 상태를 동기화합니다.
   *
   * @param node         전이 후 도착한 스토리 노드
   * @param effectBundle DB transition에 저장된 effect_bundle JSON
   * @param result       프론트에 전달할 전이 결과 코드
   * @param snapshot     전이 후 저장된 최신 진행 snapshot
   * @return 프론트에 반환할 transition 응답 DTO
   */
  private TransitionResponseDto buildResponseFromNode(
      StoryNode node, JsonNode effectBundle, String result, JsonNode snapshot) {
    // 노드의 대사(outputBundle)와 메타데이터를 포함하여 응답 빌드
    TransitionResponseDto.TransitionResponseDtoBuilder builder = TransitionResponseDto.builder()
        .nextNode(
            NextNodeDto.builder()
                .id(node.getId())
                .code(node.getCode())
                .nodeType(node.getNodeType())
                .outputBundle(node.getOutputBundle()) // 대사 및 JSON 데이터 포함
                .promptType(node.getPromptType())
                .promptMeta(node.getPromptMeta())
                .isCheckpoint(node.isCheckpoint())
                .isTerminal(node.isTerminal())
                .build())
        .snapshot(convertSnapshotToMap(snapshot))
        .result(result);

    // 효과(effectBundle)가 존재하면 DTO 리스트로 변환하여 추가
    if (effectBundle != null && !effectBundle.isEmpty()) {
      // JsonNode (ObjectNode)의 필드들을 순회하며 EffectDto 리스트 생성
      List<EffectDto> effects = new java.util.ArrayList<>();
      effectBundle
          .fields()
          .forEachRemaining(
              entry -> {
                effects.add(
                    EffectDto.builder().type(entry.getKey()).payload(entry.getValue()).build());
              });
      builder.effects(effects);
    }

    return builder.build();
  }

  /**
   * snapshot JsonNode를 TransitionResponseDto에 담을 Map으로 변환한다.
   *
   * @param snapshot 응답에 포함할 snapshot JSON
   * @return snapshot Map, snapshot이 없으면 null
   */
  private Map<String, Object> convertSnapshotToMap(JsonNode snapshot) {
    // snapshot이 없으면 응답 payload에서도 생략할 수 있도록 null을 반환한다.
    if (snapshot == null || snapshot.isNull()) {
      // 변환할 값이 없다.
      return null;
    }

    // Jackson TypeReference를 사용해 JSON object를 Map으로 안전하게 변환한다.
    return objectMapper.convertValue(
        snapshot, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {
        });
  }

  /**
   * 챕터 시작 전 해당 유저의 챕터 접근 권한(해금 여부)을 검증한다.
   *
   * <p>
   * 현재 챕터에 대한 진행 데이터가 없더라도 직전 챕터가 완료(COMPLETED)된 상태라면, 동적으로 현재 챕터의 진행 상태를
   * 해금(UNLOCKED)으로 생성하여
   * 진입을 허용한다.
   *
   * @param user    검증 대상 유저 엔티티
   * @param chapter 접근하려는 대상 챕터 엔티티
   * @throws CustomException A1002 - 챕터 접근 권한이 없거나 이전 챕터를 클리어하지 않은 경우
   */
  private void validateChapterUnlocked(User user, Chapter chapter) {
    java.util.Optional<UserChapterProgress> progressOpt = userChapterProgressRepository
        .findByUserIdAndChapterId(user.getId(), chapter.getId());

    if (progressOpt.isPresent()) {
      if (progressOpt.get().getStatus() == ChapterStatus.LOCKED) {
        throw new CustomException(ErrorCode.A1002);
      }
      return;
    }

    // 데이터가 없는 경우: 이전 챕터(sortOrder - 1) 클리어 여부 검사 후 동적 해금
    if (chapter.getSortOrder() > 1) {
      Chapter prevChapter = chapterRepository
          .findBySortOrder(chapter.getSortOrder() - 1)
          .orElseThrow(() -> new CustomException(ErrorCode.A1002));

      UserChapterProgress prevProgress = userChapterProgressRepository
          .findByUserIdAndChapterId(user.getId(), prevChapter.getId())
          .orElseThrow(() -> new CustomException(ErrorCode.A1002));

      if (prevProgress.getStatus() != ChapterStatus.COMPLETED) {
        throw new CustomException(ErrorCode.A1002);
      }

      // 이전 챕터를 깼으므로 현재 챕터 UNLOCKED 레코드 동적 생성 및 진입 허용
      UserChapterProgress newProgress = UserChapterProgress.builder()
          .user(user)
          .chapter(chapter)
          .status(ChapterStatus.UNLOCKED)
          .build();
      userChapterProgressRepository.save(newProgress);
      log.info(
          "Dynamically unlocked chapter: User={}, Chapter={}", user.getId(), chapter.getCode());
    } else {
      throw new CustomException(ErrorCode.A1002);
    }
  }

  /** 챕터 완료를 처리하고 다음 챕터를 해금한다. */
  private void handleChapterCompletion(User user, Chapter currentChapter) {
    // 1. 현재 챕터 완료 처리
    userChapterProgressRepository
        .findByUserIdAndChapterId(user.getId(), currentChapter.getId())
        .ifPresent(
            cp -> {
              cp.complete();
              userChapterProgressRepository.save(cp);
            });

    // 2. 다음 챕터 조회 및 해금 (sortOrder + 1)
    chapterRepository
        .findBySortOrder(currentChapter.getSortOrder() + 1)
        .ifPresent(
            nextChapter -> {
              // 이미 해금되어 있는지 확인 후 없으면 생성
              if (!userChapterProgressRepository.existsByUserIdAndChapterId(
                  user.getId(), nextChapter.getId())) {
                userChapterProgressRepository.save(
                    UserChapterProgress.builder()
                        .user(user)
                        .chapter(nextChapter)
                        .status(ChapterStatus.UNLOCKED)
                        .build());
                log.info(
                    "Next chapter unlocked: User={}, Chapter={}",
                    user.getId(),
                    nextChapter.getCode());
              }
            });
  }

  /**
   * 챕터 시작 또는 전이 시 사용할 빈 스냅샷(JSON)을 생성한다.
   *
   * <p>
   * Chapter 2는 결정 문서의 snapshot 기본 구조를 생성하고, 다른 챕터는 기존 위치 식별 snapshot을 유지한다.
   */
  private JsonNode createEmptySnapshot(Chapter chapter, StoryNode node) {
    // 빈 JSON 객체 생성
    ObjectNode snapshot = objectMapper.createObjectNode();

    // Chapter 2는 VFS/terminal 기반 진행 상태를 담는 확장 snapshot을 사용한다.
    if (CHAPTER_02_CODE.equals(chapter.getCode())) {
      // Chapter 2 전용 기본 snapshot 구조를 채운다.
      populateChapter2Snapshot(snapshot, chapter, node);

      // Chapter 2 snapshot은 전용 구조 생성이 끝났으므로 바로 반환한다.
      return snapshot;
    }

    // Chapter 1 등 기존 챕터는 호환성을 위해 현재 위치 식별 정보만 기록한다.
    snapshot.put("chapterId", chapter.getId()); // 챕터 PK
    snapshot.put("nodeId", node.getId()); // 노드 PK
    snapshot.put("nodeCode", node.getCode()); // 노드 코드

    // 기존 챕터용 최소 snapshot을 반환한다.
    return snapshot;
  }

  /**
   * transition 이후 저장할 snapshot을 생성하고 이전 snapshot의 상태를 이어받는다.
   *
   * @param chapter          transition 이후 챕터 엔티티
   * @param node             transition 이후 노드 엔티티
   * @param previousSnapshot transition 이전 최신 snapshot
   * @param request          유저의 transition 요청
   * @param effectBundle     transition 성공 후 snapshot에 반영할 effect_bundle
   * @return transition 이후 저장할 snapshot JSON
   */
  private JsonNode createTransitionSnapshot(
      Chapter chapter,
      StoryNode node,
      JsonNode previousSnapshot,
      TransitionRequestDto request,
      JsonNode effectBundle) {
    // 먼저 챕터에 맞는 기본 snapshot 구조를 생성한다.
    ObjectNode snapshot = (ObjectNode) createEmptySnapshot(chapter, node);

    // Chapter 2가 아니면 기존 챕터 호환성을 위해 별도 병합 없이 반환한다.
    if (!CHAPTER_02_CODE.equals(chapter.getCode())) {
      // 기존 챕터 snapshot은 위치 식별 정보만 유지한다.
      return snapshot;
    }

    // Chapter 2 snapshotVersion은 이전 버전에서 1 증가시킨다.
    snapshot.put("snapshotVersion", resolveNextSnapshotVersion(previousSnapshot));

    // 이전 terminal 상태를 새 snapshot으로 이어받는다.
    carryChapter2Terminal(snapshot, previousSnapshot, request);

    // 이전 vfsOverlay 상태를 새 snapshot으로 이어받는다.
    carryObjectField(snapshot, previousSnapshot, "vfsOverlay");

    // 이전 flags 상태를 새 snapshot으로 이어받는다.
    carryObjectField(snapshot, previousSnapshot, "flags");

    // 이전 scanPercent 값을 새 snapshot으로 이어받는다.
    carryIntegerField(snapshot, previousSnapshot, "scanPercent");

    // transition effect_bundle의 상태 변경 지시를 snapshot에 병합한다.
    applyEffectBundleToSnapshot(snapshot, effectBundle);

    // 이전 상태를 반영한 Chapter 2 transition snapshot을 반환한다.
    return snapshot;
  }

  /**
   * 이전 snapshotVersion을 기준으로 다음 snapshotVersion을 계산한다.
   *
   * @param previousSnapshot transition 이전 최신 snapshot
   * @return 다음 snapshotVersion
   */
  private int resolveNextSnapshotVersion(JsonNode previousSnapshot) {
    // 이전 snapshot에서 snapshotVersion 숫자를 읽는다.
    Integer previousVersion = extractInteger(previousSnapshot, "/snapshotVersion");

    // 이전 버전이 없으면 신규 snapshot의 최초 버전 1을 사용한다.
    if (previousVersion == null) {
      // 새로 시작한 Chapter 2 snapshot은 1부터 시작한다.
      return 1;
    }

    // 상태가 변경된 transition snapshot이므로 이전 버전에 1을 더한다.
    return previousVersion + 1;
  }

  /**
   * 이전 snapshot의 terminal 상태를 새 Chapter 2 snapshot으로 이어받는다.
   *
   * @param snapshot         값을 채울 새 snapshot JSON
   * @param previousSnapshot transition 이전 최신 snapshot
   * @param request          유저의 transition 요청
   */
  private void carryChapter2Terminal(
      ObjectNode snapshot, JsonNode previousSnapshot, TransitionRequestDto request) {
    // 새 snapshot의 terminal 객체를 가져온다.
    ObjectNode terminal = (ObjectNode) snapshot.get("terminal");

    // 이전 snapshot 또는 요청 meta에서 cwd를 결정한다.
    String cwd = resolveCwd(previousSnapshot, request);

    // cwd가 있으면 새 terminal.cwd에 반영한다.
    if (cwd != null && !cwd.isBlank()) {
      // 유저의 현재 가상 디렉터리를 유지한다.
      terminal.put("cwd", cwd);
    }

    // 이전 promptUser가 있으면 새 snapshot에 이어받는다.
    copyTextField(terminal, previousSnapshot, "/terminal/promptUser", "promptUser");

    // 이전 promptHost가 있으면 새 snapshot에 이어받는다.
    copyTextField(terminal, previousSnapshot, "/terminal/promptHost", "promptHost");

    // command 요청이면 마지막 명령어를 terminal.lastCommand에 반영한다.
    if (request != null && ACTION_TYPE_COMMAND.equals(request.getActionType())) {
      // 사용자가 입력한 command 원문을 읽는다.
      String input = request.getInputValue();

      // 입력값이 있으면 lastCommand에 저장한다.
      if (input != null) {
        // 마지막 처리 명령어를 snapshot에 남긴다.
        terminal.put("lastCommand", input);
      }
    }
  }

  /**
   * 이전 snapshot의 object 필드를 새 snapshot으로 복사한다.
   *
   * @param snapshot         값을 채울 새 snapshot JSON
   * @param previousSnapshot transition 이전 최신 snapshot
   * @param fieldName        복사할 object 필드명
   */
  private void carryObjectField(ObjectNode snapshot, JsonNode previousSnapshot, String fieldName) {
    // 이전 snapshot이 없으면 복사할 값도 없다.
    if (previousSnapshot == null) {
      // 기본 snapshot 값을 그대로 사용한다.
      return;
    }

    // 이전 snapshot에서 해당 필드를 가져온다.
    JsonNode previousValue = previousSnapshot.get(fieldName);

    // object 필드가 아니면 복사하지 않는다.
    if (previousValue == null || !previousValue.isObject()) {
      // 기본 snapshot 값을 그대로 사용한다.
      return;
    }

    // 이전 object를 deep copy해 새 snapshot에 반영한다.
    snapshot.set(fieldName, previousValue.deepCopy());
  }

  /**
   * 이전 snapshot의 정수 필드를 새 snapshot으로 복사한다.
   *
   * @param snapshot         값을 채울 새 snapshot JSON
   * @param previousSnapshot transition 이전 최신 snapshot
   * @param fieldName        복사할 정수 필드명
   */
  private void carryIntegerField(ObjectNode snapshot, JsonNode previousSnapshot, String fieldName) {
    // 이전 snapshot이 없으면 복사할 값도 없다.
    if (previousSnapshot == null) {
      // 기본 snapshot 값을 그대로 사용한다.
      return;
    }

    // 이전 snapshot에서 지정한 정수 필드를 읽는다.
    Integer previousValue = extractInteger(previousSnapshot, "/" + fieldName);

    // 값이 없으면 기본 snapshot 값을 유지한다.
    if (previousValue == null) {
      // 복사할 값이 없으므로 아무 작업도 하지 않는다.
      return;
    }

    // 이전 정수 값을 새 snapshot에 반영한다.
    snapshot.put(fieldName, previousValue);
  }

  /**
   * 이전 snapshot의 문자열 값을 대상 object field에 복사한다.
   *
   * @param target           값을 쓸 대상 object
   * @param previousSnapshot transition 이전 최신 snapshot
   * @param sourcePointer    값을 읽을 JSON Pointer
   * @param targetFieldName  값을 쓸 대상 필드명
   */
  private void copyTextField(
      ObjectNode target, JsonNode previousSnapshot, String sourcePointer, String targetFieldName) {
    // 이전 snapshot에서 문자열 값을 읽는다.
    String value = extractText(previousSnapshot, sourcePointer);

    // 값이 없으면 대상 기본값을 유지한다.
    if (value == null || value.isBlank()) {
      // 복사할 문자열이 없으므로 아무 작업도 하지 않는다.
      return;
    }

    // 읽은 문자열 값을 대상 field에 쓴다.
    target.put(targetFieldName, value);
  }

  /**
   * transition effect_bundle의 상태 변경 지시를 Chapter 2 snapshot에 반영한다.
   *
   * @param snapshot     값을 갱신할 Chapter 2 snapshot
   * @param effectBundle transition의 effect_bundle JSON
   */
  private void applyEffectBundleToSnapshot(ObjectNode snapshot, JsonNode effectBundle) {
    // effect_bundle이 없으면 반영할 상태 변경도 없다.
    if (effectBundle == null || effectBundle.isNull() || effectBundle.isEmpty()) {
      // 기존 snapshot 상태를 그대로 유지한다.
      return;
    }

    // setFlags 객체를 snapshot.flags에 병합한다.
    applySetFlags(snapshot, effectBundle.get("setFlags"));

    // setScanPercent 숫자를 snapshot.scanPercent에 반영한다.
    applySetScanPercent(snapshot, effectBundle.get("setScanPercent"));

    // vfsOverlay 변경 지시를 snapshot.vfsOverlay에 병합한다.
    applyVfsOverlayEffect(snapshot, effectBundle.get("vfsOverlay"));
  }

  /**
   * effect_bundle.setFlags를 snapshot.flags에 병합한다.
   *
   * @param snapshot 값을 갱신할 Chapter 2 snapshot
   * @param setFlags setFlags JSON object
   */
  private void applySetFlags(ObjectNode snapshot, JsonNode setFlags) {
    // setFlags가 object가 아니면 반영할 플래그가 없다.
    if (setFlags == null || !setFlags.isObject()) {
      // flag 변경 없이 종료한다.
      return;
    }

    // snapshot.flags 객체를 보장한다.
    ObjectNode flags = ensureObject(snapshot, "flags");

    // setFlags의 각 필드를 순회한다.
    setFlags
        .fields()
        .forEachRemaining(
            entry -> {
              // effect_bundle의 flag 값을 deep copy해 snapshot.flags에 저장한다.
              flags.set(entry.getKey(), entry.getValue().deepCopy());
            });
  }

  /**
   * effect_bundle.setScanPercent를 snapshot.scanPercent에 반영한다.
   *
   * @param snapshot       값을 갱신할 Chapter 2 snapshot
   * @param setScanPercent scanPercent JSON value
   */
  private void applySetScanPercent(ObjectNode snapshot, JsonNode setScanPercent) {
    // 숫자가 아니면 scanPercent 변경을 하지 않는다.
    if (setScanPercent == null || !setScanPercent.canConvertToInt()) {
      // scanPercent 유지
      return;
    }

    // scanPercent를 top-level 숫자로 저장한다.
    snapshot.put("scanPercent", setScanPercent.asInt());
  }

  /**
   * effect_bundle.vfsOverlay 변경사항을 snapshot.vfsOverlay에 병합한다.
   *
   * @param snapshot      값을 갱신할 Chapter 2 snapshot
   * @param overlayEffect vfsOverlay effect JSON object
   */
  private void applyVfsOverlayEffect(ObjectNode snapshot, JsonNode overlayEffect) {
    // overlay effect가 object가 아니면 병합할 VFS 변경이 없다.
    if (overlayEffect == null || !overlayEffect.isObject()) {
      // VFS overlay 변경 없이 종료한다.
      return;
    }

    // snapshot.vfsOverlay 객체를 보장한다.
    ObjectNode targetOverlay = ensureObject(snapshot, "vfsOverlay");

    // createdNodes 배열 변경을 병합한다.
    mergeCreatedNodes(targetOverlay, overlayEffect.get("createdNodes"));

    // removedPaths 배열 변경을 병합한다.
    mergeRemovedPaths(targetOverlay, overlayEffect.get("removedPaths"));

    // modifiedNodes 배열 변경을 병합한다.
    mergeModifiedNodes(targetOverlay, overlayEffect.get("modifiedNodes"));
  }

  /**
   * effect createdNodes를 snapshot.vfsOverlay.createdNodes에 path 기준으로 병합한다.
   *
   * @param targetOverlay snapshot의 vfsOverlay object
   * @param createdNodes  effect_bundle의 createdNodes array
   */
  private void mergeCreatedNodes(ObjectNode targetOverlay, JsonNode createdNodes) {
    // createdNodes가 배열이 아니면 병합할 생성 파일이 없다.
    if (createdNodes == null || !createdNodes.isArray()) {
      // 생성 노드 병합 없이 종료한다.
      return;
    }

    // target createdNodes 배열을 보장한다.
    ArrayNode targetCreatedNodes = ensureArray(targetOverlay, "createdNodes");

    // effect createdNodes를 순회한다.
    for (JsonNode createdNode : createdNodes) {
      // path가 있는 object만 VFS node로 인정한다.
      String path = getTextField(createdNode, "path");

      // path가 없으면 병합할 수 없다.
      if (path == null) {
        // 잘못된 overlay item은 건너뛴다.
        continue;
      }

      // 같은 path의 기존 created node를 제거한다.
      removeObjectWithPath(targetCreatedNodes, path);

      // 새 created node를 deep copy해 추가한다.
      targetCreatedNodes.add(createdNode.deepCopy());

      // 새로 생성된 path는 removedPaths에 남아 있으면 안 된다.
      removeTextValue(ensureArray(targetOverlay, "removedPaths"), path);
    }
  }

  /**
   * effect removedPaths를 snapshot.vfsOverlay.removedPaths에 중복 없이 병합한다.
   *
   * @param targetOverlay snapshot의 vfsOverlay object
   * @param removedPaths  effect_bundle의 removedPaths array
   */
  private void mergeRemovedPaths(ObjectNode targetOverlay, JsonNode removedPaths) {
    // removedPaths가 배열이 아니면 병합할 삭제 경로가 없다.
    if (removedPaths == null || !removedPaths.isArray()) {
      // 삭제 경로 병합 없이 종료한다.
      return;
    }

    // target removedPaths 배열을 보장한다.
    ArrayNode targetRemovedPaths = ensureArray(targetOverlay, "removedPaths");

    // effect removedPaths를 순회한다.
    for (JsonNode removedPath : removedPaths) {
      // textual path만 삭제 경로로 인정한다.
      if (!removedPath.isTextual()) {
        // 문자열이 아닌 항목은 건너뛴다.
        continue;
      }

      // 삭제할 path 문자열을 가져온다.
      String path = removedPath.asText();

      // 중복 없이 removedPaths에 추가한다.
      addUniqueText(targetRemovedPaths, path);

      // 삭제된 path는 createdNodes에서도 제거한다.
      removeObjectWithPath(ensureArray(targetOverlay, "createdNodes"), path);
    }
  }

  /**
   * effect modifiedNodes를 snapshot.vfsOverlay.modifiedNodes에 path 기준으로 병합한다.
   *
   * @param targetOverlay snapshot의 vfsOverlay object
   * @param modifiedNodes effect_bundle의 modifiedNodes array
   */
  private void mergeModifiedNodes(ObjectNode targetOverlay, JsonNode modifiedNodes) {
    // modifiedNodes가 배열이 아니면 병합할 수정 노드가 없다.
    if (modifiedNodes == null || !modifiedNodes.isArray()) {
      // 수정 노드 병합 없이 종료한다.
      return;
    }

    // target modifiedNodes 배열을 보장한다.
    ArrayNode targetModifiedNodes = ensureArray(targetOverlay, "modifiedNodes");

    // effect modifiedNodes를 순회한다.
    for (JsonNode modifiedNode : modifiedNodes) {
      // path가 있는 object만 modified node로 인정한다.
      String path = getTextField(modifiedNode, "path");

      // path가 없으면 병합할 수 없다.
      if (path == null) {
        // 잘못된 overlay item은 건너뛴다.
        continue;
      }

      // 같은 path의 기존 modified node를 제거한다.
      removeObjectWithPath(targetModifiedNodes, path);

      // 새 modified node를 deep copy해 추가한다.
      targetModifiedNodes.add(modifiedNode.deepCopy());
    }
  }

  /**
   * ObjectNode 하위 object field를 보장한다.
   *
   * @param parent    부모 JSON object
   * @param fieldName 보장할 object field 이름
   * @return 존재하거나 새로 만든 ObjectNode
   */
  private ObjectNode ensureObject(ObjectNode parent, String fieldName) {
    // 기존 field 값을 읽는다.
    JsonNode current = parent.get(fieldName);

    // 이미 object이면 그대로 반환한다.
    if (current != null && current.isObject()) {
      // ObjectNode로 캐스팅해 사용한다.
      return (ObjectNode) current;
    }

    // object가 아니면 새 object field를 만든다.
    return parent.putObject(fieldName);
  }

  /**
   * ObjectNode 하위 array field를 보장한다.
   *
   * @param parent    부모 JSON object
   * @param fieldName 보장할 array field 이름
   * @return 존재하거나 새로 만든 ArrayNode
   */
  private ArrayNode ensureArray(ObjectNode parent, String fieldName) {
    // 기존 field 값을 읽는다.
    JsonNode current = parent.get(fieldName);

    // 이미 array이면 그대로 반환한다.
    if (current != null && current.isArray()) {
      // ArrayNode로 캐스팅해 사용한다.
      return (ArrayNode) current;
    }

    // array가 아니면 새 array field를 만든다.
    return parent.putArray(fieldName);
  }

  /**
   * ArrayNode에서 path field가 일치하는 object를 제거한다.
   *
   * @param array 제거 대상 array
   * @param path  제거할 path
   */
  private void removeObjectWithPath(ArrayNode array, String path) {
    // 뒤에서 앞으로 순회해야 remove 시 index가 꼬이지 않는다.
    for (int i = array.size() - 1; i >= 0; i--) {
      // 현재 item을 가져온다.
      JsonNode item = array.get(i);

      // object item의 path가 일치하면 제거한다.
      if (item != null && path.equals(item.path("path").asText())) {
        // matching object를 제거한다.
        array.remove(i);
      }
    }
  }

  /**
   * ArrayNode에서 같은 textual value를 제거한다.
   *
   * @param array 제거 대상 array
   * @param value 제거할 문자열 값
   */
  private void removeTextValue(ArrayNode array, String value) {
    // 뒤에서 앞으로 순회해야 remove 시 index가 꼬이지 않는다.
    for (int i = array.size() - 1; i >= 0; i--) {
      // 현재 item을 가져온다.
      JsonNode item = array.get(i);

      // textual item 값이 일치하면 제거한다.
      if (item != null && item.isTextual() && value.equals(item.asText())) {
        // matching text를 제거한다.
        array.remove(i);
      }
    }
  }

  /**
   * ArrayNode에 문자열 값을 중복 없이 추가한다.
   *
   * @param array 추가 대상 array
   * @param value 추가할 문자열 값
   */
  private void addUniqueText(ArrayNode array, String value) {
    // 기존 값이 있는지 확인한다.
    for (JsonNode item : array) {
      // 같은 문자열이 있으면 추가하지 않는다.
      if (item.isTextual() && value.equals(item.asText())) {
        // 중복 추가를 피한다.
        return;
      }
    }

    // 기존 값이 없으면 새 문자열 item을 추가한다.
    array.add(value);
  }

  /**
   * Chapter 2 결정 문서에 맞는 기본 snapshot 필드를 채운다.
   *
   * @param snapshot 값을 채울 빈 snapshot JSON
   * @param chapter  Chapter 2 챕터 엔티티
   * @param node     현재 스토리 노드 엔티티
   */
  private void populateChapter2Snapshot(ObjectNode snapshot, Chapter chapter, StoryNode node) {
    // snapshot 구조 자체의 버전을 저장한다.
    snapshot.put("schemaVersion", 1);

    // 새 snapshot은 최초 상태 변경 버전 1로 시작한다.
    snapshot.put("snapshotVersion", 1);

    // 현재 snapshot이 기준으로 삼는 VFS JSON 버전을 저장한다.
    snapshot.put("vfsVersion", CHAPTER_02_VFS_VERSION);

    // 현재 챕터 코드를 snapshot에 저장한다.
    snapshot.put("chapterCode", chapter.getCode());

    // 기존 코드와의 호환을 위해 챕터 PK도 함께 저장한다.
    snapshot.put("chapterId", chapter.getId());

    // 기존 코드와의 호환을 위해 노드 PK도 함께 저장한다.
    snapshot.put("nodeId", node.getId());

    // 현재 스토리 노드 코드를 저장한다.
    snapshot.put("nodeCode", node.getCode());

    // 가상 터미널의 현재 세션 상태를 채운다.
    populateChapter2Terminal(snapshot);

    // 유저별 동적 VFS 변경 영역을 빈 구조로 초기화한다.
    populateChapter2VfsOverlay(snapshot);

    // Chapter 2 진행 플래그를 기본값으로 초기화한다.
    populateChapter2Flags(snapshot);

    // GC 스캔율은 top-level 숫자로 저장하며 초기값은 0이다.
    snapshot.put("scanPercent", 0);
  }

  /**
   * Chapter 2 snapshot의 terminal 객체를 기본값으로 채운다.
   *
   * @param snapshot terminal 객체를 추가할 snapshot JSON
   */
  private void populateChapter2Terminal(ObjectNode snapshot) {
    // terminal 객체를 snapshot 하위에 생성한다.
    ObjectNode terminal = snapshot.putObject("terminal");

    // Chapter 2 기본 cwd를 VFS 결정 문서의 defaultCwd와 맞춘다.
    terminal.put("cwd", CHAPTER_02_DEFAULT_CWD);

    // 터미널 프롬프트 사용자명을 저장한다.
    terminal.put("promptUser", CHAPTER_02_PROMPT_USER);

    // 터미널 프롬프트 호스트명을 저장한다.
    terminal.put("promptHost", CHAPTER_02_PROMPT_HOST);

    // 아직 처리한 명령이 없으므로 lastCommand는 null로 둔다.
    terminal.putNull("lastCommand");
  }

  /**
   * Chapter 2 snapshot의 vfsOverlay 객체를 빈 변경 목록으로 초기화한다.
   *
   * @param snapshot vfsOverlay 객체를 추가할 snapshot JSON
   */
  private void populateChapter2VfsOverlay(ObjectNode snapshot) {
    // vfsOverlay 객체를 snapshot 하위에 생성한다.
    ObjectNode vfsOverlay = snapshot.putObject("vfsOverlay");

    // 유저가 생성한 동적 VFS node 목록을 빈 배열로 둔다.
    vfsOverlay.set("createdNodes", objectMapper.createArrayNode());

    // 유저 진행 중 제거된 path 목록을 빈 배열로 둔다.
    vfsOverlay.set("removedPaths", objectMapper.createArrayNode());

    // MVP에서는 수정된 node 목록을 빈 배열로 둔다.
    vfsOverlay.set("modifiedNodes", objectMapper.createArrayNode());
  }

  /**
   * Chapter 2 snapshot의 flags 객체를 결정 문서의 기본값으로 초기화한다.
   *
   * @param snapshot flags 객체를 추가할 snapshot JSON
   */
  private void populateChapter2Flags(ObjectNode snapshot) {
    // flags 객체를 snapshot 하위에 생성한다.
    ObjectNode flags = snapshot.putObject("flags");

    // Chapter 2가 시작된 snapshot이므로 시작 플래그는 true로 둔다.
    flags.put("chapter2_started", true);

    // 최초 ls 확인 여부는 아직 false다.
    flags.put("chapter2_file_list_checked", false);

    // world_map.map 확인 여부는 아직 false다.
    flags.put("world_map_checked", false);

    // observer_status.log 확인 여부는 아직 false다.
    flags.put("observer_status_checked", false);

    // lucas_fragment_01.sh 확인 여부는 아직 false다.
    flags.put("lucas_fragment_checked", false);

    // lucas_fragment_01.sh 실행 시도 여부는 아직 false다.
    flags.put("lucas_fragment_exec_attempted", false);

    // GC 스캔 시작 여부는 아직 false다.
    flags.put("gc_scan_started", false);

    // laplace fragment 미션 시작 여부는 아직 false다.
    flags.put("laplace_mission_started", false);

    // .tmp 파일 탐색 완료 여부는 아직 false다.
    flags.put("tmp_files_found", false);

    // 보호 코어 접근 시도 여부는 아직 false다.
    flags.put("protected_core_access_attempted", false);

    // decoy.tar 생성 여부는 아직 false다.
    flags.put("decoy_created", false);

    // decoy.tar 전송 여부는 아직 false다.
    flags.put("decoy_sent", false);

    // 흔적 삭제 완료 여부는 아직 false다.
    flags.put("trace_cleaned", false);

    // 복구 문서 확인 여부는 아직 false다.
    flags.put("recovered_document_viewed", false);

    // Chapter 2 완료 여부는 아직 false다.
    flags.put("chapter2_completed", false);
  }

  /**
   * Chapter 2 터미널 노드에서 매칭되는 전이가 없을 때 일반 명령어(자유 탐색)를 처리하는 폴백 메소드입니다. DB 전이 검색에 실패한
   * 경우 호출되며, VFS 로직을
   * 통해 결과를 생성합니다.
   *
   * @param user        요청을 보낸 인증 유저 객체
   * @param progress    유저의 현재 스토리 진행 상태 기록
   * @param currentNode 유저가 현재 위치한 스토리 노드
   * @param request     전이 요청 데이터 (입력된 명령어 포함)
   * @return STAY 타입의 전이 결과 응답 (터미널 출력값 포함) 또는 처리 불가 시 null
   */
  private TransitionResponseDto handleChapter2TerminalFallback(
      User user, UserStoryProgress progress, StoryNode currentNode, TransitionRequestDto request) {

    // 1. 현재 노드의 메타데이터를 확인하여 Chapter 2 터미널 프로필인지 검증합니다.
    JsonNode promptMeta = currentNode.getPromptMeta();
    // 프로필 정보가 없거나 chapter2가 아니면 폴백 처리를 하지 않습니다.
    if (promptMeta == null || !"chapter2".equals(promptMeta.path("terminalProfile").asText())) {
      return null;
    }

    // 2. 액션 타입이 command이고 실제 입력값이 존재하는지 확인합니다.
    if (!ACTION_TYPE_COMMAND.equals(request.getActionType()) || request.getInputValue() == null) {
      return null;
    }

    // 3. 입력된 문자열을 명령어와 인자 리스트로 파싱합니다.
    ParsedCommand command = parseCommand(request.getInputValue());
    // 파싱 결과가 유효하지 않으면(공백 등) 처리를 중단합니다.
    if (command == null) {
      return null;
    }

    // 4. 유저 진행 상태에서 최신 스냅샷을 꺼내고, 가상 파일 시스템(VFS) 컨텍스트를 구성합니다.
    JsonNode latestSnapshot = progress.getLatestSnapshotJson();
    // 정적 VFS 구조와 스냅샷 내의 동적 변경사항(vfsOverlay)을 병합합니다.
    VfsContext vfs = VfsContext.of(chapter02Vfs, latestSnapshot.path("vfsOverlay"));

    // 5. TerminalCommandService를 통해 명령어를 실행하고 결과를 받아옵니다.
    // 스냅샷 내의 terminal 섹션 데이터(현재 CWD 등)를 함께 전달합니다.
    TerminalResult result = terminalCommandService.execute(command, latestSnapshot.path("terminal"), vfs);

    // 6. 실행 결과를 반영하여 새로운 스냅샷 데이터를 생성합니다.
    ObjectNode updatedSnapshot = (ObjectNode) latestSnapshot.deepCopy();
    // 스냅샷 버전을 1 증가시켜 상태 변화를 추적 가능하게 합니다.
    int version = updatedSnapshot.path("snapshotVersion").asInt(0);
    updatedSnapshot.put("snapshotVersion", version + 1);

    // 7. 터미널 세션 정보를 업데이트합니다. (변경된 CWD, 마지막 실행 명령어 등)
    ObjectNode terminalNode = (ObjectNode) updatedSnapshot.path("terminal");
    terminalNode.put("cwd", result.cwd()); // 명령어 실행 후의 현재 경로 반영
    terminalNode.put("lastCommand", request.getInputValue()); // 실행한 원문 명령어 기록

    // 8. 갱신된 진행 상태(노드 유지, 스냅샷 업데이트)를 DB에 영속화합니다.
    progress.updateProgress(currentNode.getChapter(), currentNode, updatedSnapshot);
    userStoryProgressRepository.save(progress);

    // ELK/RAG 행동 로깅 (incoming)
    logStoryAction(
        user,
        currentNode.getChapter(),
        currentNode,
        currentNode,
        request,
        "SUCCESS".equals(result.resultCode()) ? "SUCCESS" : "FAIL");

    // 9. 명령어 실행 결과를 Redis 최근 행동 이력(recent-actions)에 기록합니다.
    // 결과 코드에 따라 성공(SUCCESS_STAY) 또는 실패(FAIL_STAY)로 구분합니다.
    recordRecentActionAfterCommit(
        buildRecentActionEvent(
            user,
            currentNode.getChapter(),
            request,
            null,
            currentNode,
            currentNode,
            updatedSnapshot,
            "SUCCESS".equals(result.resultCode()) ? "SUCCESS_STAY" : "FAIL_STAY"));

    // 10. 프론트엔드에 전달할 최종 응답 DTO를 빌드하여 반환합니다.
    return TransitionResponseDto.builder()
        .result("stay") // 노드 이동 없이 현재 위치를 유지함을 명시합니다.
        .terminalResult(
            TransitionResponseDto.TerminalResultDto.builder()
                .stdout(result.stdout()) // 표준 출력 내용
                .stderr(result.stderr()) // 표준 에러 내용
                .cwd(result.cwd()) // 결과 경로
                .prompt(result.prompt()) // 다음에 표시될 프롬프트
                .resultCode(result.resultCode()) // 실행 성공 여부 코드
                .build())
        .snapshot(
            objectMapper.convertValue(
                updatedSnapshot,
                new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {
                }))
        .build();
  }

  /**
   * 유저가 입력한 원문 문자열을 명령어 토큰으로 분리합니다.
   *
   * @param input 유저 입력 문자열
   * @return 파싱된 ParsedCommand 객체 (비어있을 경우 null)
   */
  private ParsedCommand parseCommand(String input) {
    // null 입력은 파싱할 수 없다.
    if (input == null) {
      // command 객체를 만들 수 없으므로 null을 반환한다.
      return null;
    }

    // 앞뒤 공백을 제거합니다.
    String trimmed = input.trim();
    // 빈 입력이면 null을 반환합니다.
    if (trimmed.isEmpty()) {
      return null;
    }

    // 따옴표와 escape를 고려해 입력을 토큰화합니다.
    List<String> parts = tokenizeCommand(trimmed);

    // 토큰화 실패 또는 빈 결과면 null을 반환합니다.
    if (parts.isEmpty()) {
      return null;
    }

    // 첫 번째 토큰을 명령어로 설정합니다.
    String cmd = parts.get(0);
    // 두 번째 토큰부터는 인자 리스트로 수집합니다.
    List<String> args = parts.stream().skip(1).collect(Collectors.toList());

    // 분석된 결과를 객체에 담아 반환합니다.
    return new ParsedCommand(cmd, args, input);
  }
}
