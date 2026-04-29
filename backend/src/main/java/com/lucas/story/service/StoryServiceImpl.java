package com.lucas.story.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import com.lucas.story.service.terminal.*;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
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
 * <p>플레이어의 스토리 시작, 현재 위치 조회, 상태 전이(transition) 처리, 그리고 최근 행동 맥락 기록 기능을 제공한다.
 *
 * <p>핵심 흐름: 1) DB의 story_transitions 테이블 기반으로 전이 매칭 2) 진행 상태와 스냅샷 갱신 3) 확정된 전이 결과를 Redis
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
  private static final String RULE_AUTO_SYSTEM = "AUTO_SYSTEM";
  private static final String RULE_NORMALIZED_COMMAND = "NORMALIZED_COMMAND";
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
  private final ObjectMapper objectMapper;

  private JsonNode chapter02Vfs;

  @PostConstruct
  public void init() {
    loadVfsJson();
  }

  private void loadVfsJson() {
    try (InputStream is = getClass().getResourceAsStream("/story/chapter02/vfs.json")) {
      if (is != null) {
        this.chapter02Vfs = objectMapper.readTree(is);
        log.info("Loaded Chapter 2 VFS from /story/chapter02/vfs.json");
      }
    } catch (Exception e) {
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
    Chapter chapter =
        chapterRepository
            .findByCode(request.getChapterCode())
            .orElseThrow(() -> new CustomException(ErrorCode.E3001));

    // 해당 챕터의 첫 번째 노드를 ID 순으로 조회
    StoryNode firstNode =
        storyNodeRepository
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
  @Transactional
  public StoryNodeResponseDto findCurrentNode(Long userId) {
    // 유저 조회
    User user = getAuthenticatedUser(userId);

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
   * <p>처리 순서: 1) 현재 진행 상태 조회 2) story_transitions 테이블에서 매칭되는 전이 검색 3) 진행 상태 갱신 4) 확정된 결과를 Redis
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
        transitions.stream().filter(t -> matchesTransition(t, request)).findFirst().orElse(null);

    if (matched == null) {
      // ── Step 2: Chapter 2 터미널 Fallback ──
      // DB 전이에 실패했을 때, Chapter 2 터미널 노드라면 가상 파일 시스템 로직으로 처리한다.
      TransitionResponseDto terminalResponse =
          handleChapter2TerminalFallback(user, progress, currentNode, request);
      if (terminalResponse != null) {
        return terminalResponse;
      }

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
    // 이렇게 해야 플레이어가 오답 입력 후 다시 정답을 입력했을 때 원래 노드 기준으로 전이가 판정된다.
    boolean isFailNode = nextNode.getCode().contains("_FAIL_");

    if (isFailNode) {
      Chapter failChapter = nextNode.getChapter();
      JsonNode failSnapshot =
          createTransitionSnapshot(
              failChapter, nextNode, progress.getLatestSnapshotJson(), request);
      progress.updateProgress(failChapter, nextNode, failSnapshot);
      userStoryProgressRepository.save(progress);

      log.info(
          "Fail node reached (progress updated): User={}, FailNode={}",
          user.getId(),
          nextNode.getCode());
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
      return buildResponseFromNode(nextNode, matched.getEffectBundle(), "retry");
    }

    // 도착 노드가 속한 챕터 정보
    Chapter chapter = nextNode.getChapter();
    // 현재 상태 스냅샷 생성
    JsonNode snapshot =
        createTransitionSnapshot(chapter, nextNode, progress.getLatestSnapshotJson(), request);

    // 유저 진행 상태를 다음 노드로 갱신 후 저장
    progress.updateProgress(chapter, nextNode, snapshot);
    userStoryProgressRepository.save(progress);

    // ── Step 4: 챕터 완료 및 다음 챕터 해금 처리 ──
    // 도착한 노드가 종단 노드(엔딩)인 경우, 현재 챕터를 완료 처리하고 다음 챕터를 해금한다.
    if (nextNode.isTerminal() || "ending".equals(nextNode.getNodeType())) {
      handleChapterCompletion(user, chapter);
    }

    // 다음 노드 정보와 전이 효과(effects)를 응답 DTO로 변환하여 반환
    // 정상 이동 결과를 transaction commit 이후 Redis recent-actions에 반영한다.
    recordRecentActionAfterCommit(
        buildRecentActionEvent(
            user, chapter, request, matched, currentNode, nextNode, snapshot, "SUCCESS_MOVE"));

    return buildResponseFromNode(nextNode, matched.getEffectBundle(), "success");
  }

  // ══════════════════════════════════════════════
  //  Private Helper Methods
  // ══════════════════════════════════════════════

  /**
   * 매칭되는 transition이 없어서 거절된 요청을 Redis recent-actions에 기록한다.
   *
   * @param user 요청을 보낸 인증 유저
   * @param progress 유저의 현재 스토리 진행 상태
   * @param currentNode 요청 당시 유저가 위치한 노드
   * @param request 유저가 보낸 transition 요청
   * @param exception transition 매칭 실패 예외
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
    RecentActionEvent event =
        RecentActionEvent.builder()
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
   * @param user 요청을 보낸 인증 유저
   * @param chapter transition 이후 유저가 위치한 챕터
   * @param request 유저가 보낸 transition 요청
   * @param transition 매칭된 story transition
   * @param fromNode transition 출발 노드
   * @param toNode transition 도착 노드
   * @param snapshot transition 이후 저장할 snapshot
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
   * @param transition 매칭된 story transition
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
   * @param request 유저가 보낸 transition 요청
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
   * @param request 유저가 보낸 transition 요청
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
   * @param pointer JSON Pointer 경로
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
   * @param pointer JSON Pointer 경로
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
    User user =
        userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.E3000));

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
   * 전이(Transition)가 유저의 요청과 매칭되는지 검증한다. - actionType 일치 여부 확인 - validatorType에 따라 exact(완전 일치) 또는
   * regex(정규식) 비교
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
      case "server_rule" -> matchesServerRuleTransition(t, request);
      default -> false; // 지원하지 않는 validatorType은 매칭 실패로 처리
    };
  }

  /**
   * server_rule validator_config를 기준으로 transition 매칭 여부를 판단한다.
   *
   * @param transition DB에서 조회한 server_rule transition
   * @param request 유저의 transition 요청
   * @return server_rule이 통과하면 true
   */
  private boolean matchesServerRuleTransition(
      StoryTransition transition, TransitionRequestDto request) {
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
      case RULE_NORMALIZED_COMMAND -> matchesNormalizedCommandRule(config, request);
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
   * @param config transition의 validator_config JSON
   * @param request 유저의 transition 요청
   * @return command와 args가 정규화 기준으로 일치하면 true
   */
  private boolean matchesNormalizedCommandRule(JsonNode config, TransitionRequestDto request) {
    // request가 없으면 사용자가 입력한 명령어를 읽을 수 없다.
    if (request == null) {
      // 요청 객체가 없으면 매칭 실패로 처리한다.
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
   * validator_config에서 문자열 필드를 안전하게 읽는다.
   *
   * @param node 값을 읽을 JSON node
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
   * @param node 값을 읽을 JSON node
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

  private TransitionResponseDto buildResponseFromNode(
      StoryNode node, JsonNode effectBundle, String result) {
    // 노드의 대사(outputBundle)와 메타데이터를 포함하여 응답 빌드
    TransitionResponseDto.TransitionResponseDtoBuilder builder =
        TransitionResponseDto.builder()
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
   * 챕터 시작 전 해당 유저의 챕터 접근 권한(해금 여부)을 검증한다.
   *
   * <p>현재 챕터에 대한 진행 데이터가 없더라도 직전 챕터가 완료(COMPLETED)된 상태라면, 동적으로 현재 챕터의 진행 상태를 해금(UNLOCKED)으로 생성하여
   * 진입을 허용한다.
   *
   * @param user 검증 대상 유저 엔티티
   * @param chapter 접근하려는 대상 챕터 엔티티
   * @throws CustomException A1002 - 챕터 접근 권한이 없거나 이전 챕터를 클리어하지 않은 경우
   */
  private void validateChapterUnlocked(User user, Chapter chapter) {
    java.util.Optional<UserChapterProgress> progressOpt =
        userChapterProgressRepository.findByUserIdAndChapterId(user.getId(), chapter.getId());

    if (progressOpt.isPresent()) {
      if (progressOpt.get().getStatus() == ChapterStatus.LOCKED) {
        throw new CustomException(ErrorCode.A1002);
      }
      return;
    }

    // 데이터가 없는 경우: 이전 챕터(sortOrder - 1) 클리어 여부 검사 후 동적 해금
    if (chapter.getSortOrder() > 1) {
      Chapter prevChapter =
          chapterRepository
              .findBySortOrder(chapter.getSortOrder() - 1)
              .orElseThrow(() -> new CustomException(ErrorCode.A1002));

      UserChapterProgress prevProgress =
          userChapterProgressRepository
              .findByUserIdAndChapterId(user.getId(), prevChapter.getId())
              .orElseThrow(() -> new CustomException(ErrorCode.A1002));

      if (prevProgress.getStatus() != ChapterStatus.COMPLETED) {
        throw new CustomException(ErrorCode.A1002);
      }

      // 이전 챕터를 깼으므로 현재 챕터 UNLOCKED 레코드 동적 생성 및 진입 허용
      UserChapterProgress newProgress =
          UserChapterProgress.builder()
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
   * <p>Chapter 2는 결정 문서의 snapshot 기본 구조를 생성하고, 다른 챕터는 기존 위치 식별 snapshot을 유지한다.
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
   * @param chapter transition 이후 챕터 엔티티
   * @param node transition 이후 노드 엔티티
   * @param previousSnapshot transition 이전 최신 snapshot
   * @param request 유저의 transition 요청
   * @return transition 이후 저장할 snapshot JSON
   */
  private JsonNode createTransitionSnapshot(
      Chapter chapter, StoryNode node, JsonNode previousSnapshot, TransitionRequestDto request) {
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
   * @param snapshot 값을 채울 새 snapshot JSON
   * @param previousSnapshot transition 이전 최신 snapshot
   * @param request 유저의 transition 요청
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
   * @param snapshot 값을 채울 새 snapshot JSON
   * @param previousSnapshot transition 이전 최신 snapshot
   * @param fieldName 복사할 object 필드명
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
   * @param snapshot 값을 채울 새 snapshot JSON
   * @param previousSnapshot transition 이전 최신 snapshot
   * @param fieldName 복사할 정수 필드명
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
   * @param target 값을 쓸 대상 object
   * @param previousSnapshot transition 이전 최신 snapshot
   * @param sourcePointer 값을 읽을 JSON Pointer
   * @param targetFieldName 값을 쓸 대상 필드명
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
   * Chapter 2 결정 문서에 맞는 기본 snapshot 필드를 채운다.
   *
   * @param snapshot 값을 채울 빈 snapshot JSON
   * @param chapter Chapter 2 챕터 엔티티
   * @param node 현재 스토리 노드 엔티티
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
   * Chapter 2 터미널 노드에서 매칭되는 전이가 없을 때 일반 명령어를 처리한다.
   *
   * @param user 요청 유저
   * @param progress 진행 상태
   * @param currentNode 현재 노드
   * @param request 전이 요청
   * @return STAY 결과 응답 또는 처리 불가 시 null
   */
  private TransitionResponseDto handleChapter2TerminalFallback(
      User user, UserStoryProgress progress, StoryNode currentNode, TransitionRequestDto request) {

    // 1. 터미널 프로필 확인
    JsonNode promptMeta = currentNode.getPromptMeta();
    if (promptMeta == null || !"chapter2".equals(promptMeta.path("terminalProfile").asText())) {
      return null;
    }

    // command 액션만 처리
    if (!ACTION_TYPE_COMMAND.equals(request.getActionType()) || request.getInputValue() == null) {
      return null;
    }

    // 2. 명령어 파싱
    ParsedCommand command = parseCommand(request.getInputValue());
    if (command == null) {
      return null;
    }

    // 3. VFS 및 Snapshot 로드
    JsonNode latestSnapshot = progress.getLatestSnapshotJson();
    VfsContext vfs = VfsContext.of(chapter02Vfs, latestSnapshot.path("vfsOverlay"));

    // 4. 명령어 실행
    TerminalResult result =
        terminalCommandService.execute(command, latestSnapshot.path("terminal"), vfs);

    // 5. 스냅샷 업데이트 (CWD 변경 반영 및 버전 증가)
    ObjectNode updatedSnapshot = (ObjectNode) latestSnapshot.deepCopy();
    int version = updatedSnapshot.path("snapshotVersion").asInt(0);
    updatedSnapshot.put("snapshotVersion", version + 1);

    ObjectNode terminalNode = (ObjectNode) updatedSnapshot.path("terminal");
    terminalNode.put("cwd", result.cwd());
    terminalNode.put("lastCommand", request.getInputValue());

    // 진행 상태 저장
    progress.updateProgress(currentNode.getChapter(), currentNode, updatedSnapshot);
    userStoryProgressRepository.save(progress);

    // 6. Redis 기록 (STAY 결과 기록)
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

    // 7. 응답 빌드 (stay 결과)
    return TransitionResponseDto.builder()
        .result("stay")
        .terminalResult(
            TransitionResponseDto.TerminalResultDto.builder()
                .stdout(result.stdout())
                .stderr(result.stderr())
                .cwd(result.cwd())
                .prompt(result.prompt())
                .resultCode(result.resultCode())
                .build())
        .snapshot(objectMapper.convertValue(updatedSnapshot, Map.class))
        .build();
  }

  private ParsedCommand parseCommand(String input) {
    String trimmed = input.trim();
    if (trimmed.isEmpty()) {
      return null;
    }

    String[] parts = trimmed.split("\\s+");
    String cmd = parts[0];
    List<String> args = Arrays.stream(parts).skip(1).collect(Collectors.toList());

    return new ParsedCommand(cmd, args, input);
  }
}
