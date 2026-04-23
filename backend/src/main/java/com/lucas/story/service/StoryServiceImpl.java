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

  private static final String ACTION_TYPE_COMMAND = "command";

  private final UserRepository userRepository;
  private final ChapterRepository chapterRepository;
  private final StoryNodeRepository storyNodeRepository;
  private final StoryTransitionRepository storyTransitionRepository;
  private final UserStoryProgressRepository userStoryProgressRepository;
  private final UserChapterProgressRepository userChapterProgressRepository;
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
   * <p>처리 우선순위: 1) 명령어 로깅 — Redis에 기록하여 RAG 및 유저 맥락 파악에 활용 2) Mock 명령어 — ls, pwd 등 시뮬레이션 대상이면 DB 조회
   * 없이 즉시 응답 3) DB 기반 전이 — story_transitions 테이블에서 매칭되는 전이를 찾아 상태 이동
   *
   * @param request 유저 액션 정보 (nodeId, actionType, inputValue)
   * @return 전이 결과 응답 DTO (다음 노드 + 효과)
   * @throws CustomException E3003 - 진행 기록 미존재, A1001 - 매칭 전이 없음
   */
  @Override
  @Transactional
  public TransitionResponseDto processTransition(Long userId, TransitionRequestDto request) {
    User user = getAuthenticatedUser(userId);

    // ── Step 1: 명령어 로깅 (Redis) ──
    // 유저가 입력한 명령어를 Redis에 기록하여
    // 추후 RAG 기반 역량 분석 및 유저 맥락 파악에 활용한다.
    if (ACTION_TYPE_COMMAND.equals(request.getActionType())) {
      commandLogService.logCommand(user.getId(), request.getInputValue());
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

    // ── FAIL 노드 판별 ──
    // 코드에 "_FAIL_"이 포함된 노드는 일시적 피드백 전용 노드이다.
    // FAIL 노드로 이동 시에는 유저 진행 상태를 갱신하지 않고, result=retry로 반환한다.
    // 이렇게 해야 플레이어가 오답 입력 후 다시 정답을 입력했을 때 원래 노드 기준으로 전이가 판정된다.
    boolean isFailNode = nextNode.getCode().contains("_FAIL_");

    if (isFailNode) {
      log.info(
          "Fail node reached (progress NOT updated): User={}, FailNode={}",
          user.getId(),
          nextNode.getCode());
      return buildResponseFromNode(nextNode, matched.getEffectBundle(), "retry");
    }

    // 도착 노드가 속한 챕터 정보
    Chapter chapter = nextNode.getChapter();
    // 현재 상태 스냅샷 생성
    JsonNode snapshot = createEmptySnapshot(chapter, nextNode);

    // 유저 진행 상태를 다음 노드로 갱신 후 저장
    progress.updateProgress(chapter, nextNode, snapshot);
    userStoryProgressRepository.save(progress);

    // ── Step 4: 챕터 완료 및 다음 챕터 해금 처리 ──
    // 도착한 노드가 종단 노드(엔딩)인 경우, 현재 챕터를 완료 처리하고 다음 챕터를 해금한다.
    if (nextNode.isTerminal() || "ending".equals(nextNode.getNodeType())) {
      handleChapterCompletion(user, chapter);
    }

    // 다음 노드 정보와 전이 효과(effects)를 응답 DTO로 변환하여 반환
    return buildResponseFromNode(nextNode, matched.getEffectBundle(), "success");
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
  @Transactional
  public List<String> getRecentCommands(Long userId) {
    // 유저 조회
    User user = getAuthenticatedUser(userId);
    // Redis에서 해당 유저의 최근 명령어 리스트 조회
    return commandLogService.getRecentCommands(user.getId());
  }

  // ══════════════════════════════════════════════
  //  Private Helper Methods
  // ══════════════════════════════════════════════

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
      case "server_rule" -> matchesServerRuleTransition(t, request);
      default -> false; // TODO: server_rule 등 추가 validatorType 지원 시 확장
    };
  }

  private boolean matchesServerRuleTransition(
      StoryTransition transition, TransitionRequestDto request) {
    JsonNode config = transition.getValidatorConfig();
    String trigger =
        config != null && config.has("trigger") ? config.get("trigger").asText() : null;

    // TODO: 정식 서버 룰 엔진 도입 전까지 system:auto 전이만 최소 지원한다.
    return "auto".equals(trigger) && "auto".equals(request.getInputValue());
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
   * <p>현재 챕터에 대한 진행 데이터가 없더라도 직전 챕터가 완료(COMPLETED)된 상태라면,
   * 동적으로 현재 챕터의 진행 상태를 해금(UNLOCKED)으로 생성하여 진입을 허용한다.
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
