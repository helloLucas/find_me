package com.lucas.story.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
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

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StoryServiceImpl implements StoryService {

    private static final String GUEST_EMAIL = "guest@nexus.com";

    private final UserRepository userRepository;
    private final ChapterRepository chapterRepository;
    private final StoryNodeRepository storyNodeRepository;
    private final StoryTransitionRepository storyTransitionRepository;
    private final UserStoryProgressRepository userStoryProgressRepository;
    private final CommandLogService commandLogService;
    private final ObjectMapper objectMapper;

    /**
     * 특정 챕터의 스토리 진행을 시작하거나 재시작합니다.
     *
     * @param request 시작할 챕터 코드가 포함된 DTO
     * @return 시작된 챕터의 첫 번째 노드 정보
     */
    @Override
    @Transactional
    public StoryNodeResponseDto startStory(StartStoryRequestDto request) {
        // 1. 요청받은 코드로 대상 챕터와 해당 챕터의 첫 번째 노드를 조회합니다.
        Chapter chapter =
                chapterRepository
                        .findByCode(request.getChapterCode())
                        .orElseThrow(() -> new CustomException(ErrorCode.E3001));

        StoryNode firstNode =
                storyNodeRepository
                        .findFirstByChapter_CodeOrderByIdAsc(request.getChapterCode())
                        .orElseThrow(() -> new CustomException(ErrorCode.E3002));

        User user = findGuestUser();
        UserStoryProgress progress =
                userStoryProgressRepository.findById(user.getId()).orElse(null);

        // 2. 챕터 진행 순서 및 점프 여부를 검증합니다 (스키마 변경 없는 밸리데이션).
        validateChapterProgression(progress, chapter);

        JsonNode emptySnapshot = createEmptySnapshot(chapter, firstNode);

        // 3. 신규 유저라면 진행 데이터를 생성하고, 기존 유저라면 해당 챕터의 처음으로 상태를 업데이트합니다.
        if (progress == null) {
            progress =
                    UserStoryProgress.builder()
                            .user(user)
                            .latestChapter(chapter)
                            .latestNode(firstNode)
                            .latestSnapshotJson(emptySnapshot)
                            .build();
        } else {
            progress.updateProgress(chapter, firstNode, emptySnapshot);
        }

        userStoryProgressRepository.save(progress);

        log.info("Story started/restarted: User={}, Chapter={}", user.getId(), chapter.getCode());

        return StoryNodeResponseDto.from(firstNode);
    }

    /**
     * 사용자의 현재 진행 단계와 요청한 챕터 사이의 정합성을 검증합니다. 스키마 변경 없이 DB의 sort_order와 is_terminal 필드만 활용하여 점프 및 순차
     * 진행여부를 체크합니다.
     *
     * @param currentProgress 현재 진행 상태 (null일 수 있음)
     * @param requestedChapter 진입하려는 대상 챕터
     */
    private void validateChapterProgression(
            UserStoryProgress currentProgress, Chapter requestedChapter) {
        // 1. 신규 사용자인 경우: 반드시 첫 번째 챕터(sort_order=1)부터 시작해야 합니다.
        if (currentProgress == null) {
            if (requestedChapter.getSortOrder() != 1) {
                log.warn(
                        "New user tried to jump to chapter with sort_order: {}",
                        requestedChapter.getSortOrder());
                throw new CustomException(ErrorCode.A1002);
            }
            return;
        }

        Chapter currentChapter = currentProgress.getLatestChapter();
        StoryNode currentNode = currentProgress.getLatestNode();

        int currentOrder = currentChapter.getSortOrder();
        int requestedOrder = requestedChapter.getSortOrder();

        // 2. 이전 챕터로 돌아가거나 현재 챕터를 다시 시작하는 경우: 항상 허용합니다.
        if (requestedOrder <= currentOrder) {
            return;
        }

        // 3. 바로 다음 챕터(N+1)로 넘어가는 경우: 현재 챕터 정보가 '종료(Terminal)' 상태인지 확인합니다.
        if (requestedOrder == currentOrder + 1) {
            if (!currentNode.isTerminal()) {
                log.warn(
                        "User tried to start next chapter without finishing current: {}",
                        currentChapter.getCode());
                throw new CustomException(ErrorCode.A1002);
            }
            return;
        }

        // 4. 2단계 이상 앞선 챕터로 점프하는 경우: 보안 및 개연성을 위해 차단합니다.
        if (requestedOrder > currentOrder + 1) {
            log.warn("User tried to jump from chapter {} to {}", currentOrder, requestedOrder);
            throw new CustomException(ErrorCode.A1002);
        }
    }

    /**
     * 현재 로그인한 사용자의 진행 중인 스토리 노드 정보를 조회합니다.
     *
     * @return 현재 진행 중인 노드 정보
     */
    @Override
    public StoryNodeResponseDto findCurrentNode() {
        User user = findGuestUser();
        UserStoryProgress progress =
                userStoryProgressRepository
                        .findById(user.getId())
                        .orElseThrow(() -> new CustomException(ErrorCode.E3003));

        return StoryNodeResponseDto.from(progress.getLatestNode());
    }

    /**
     * 사용자의 입력값에 따라 다음 스토리 노드로 상태를 전이시킵니다. 전이 성공 시 해당 유저의 진행 상태를 영구 저장합니다.
     *
     * @param request 동작 유형과 입력값이 포함된 DTO
     * @return 전이된 이후의 새로운 노드 정보
     */
    @Override
    @Transactional
    public TransitionResponseDto processTransition(TransitionRequestDto request) {
        User user = findGuestUser();

        // 'command' 타입인 경우 Redis에 기록합니다. (RAG 및 유저 맥락 파악용)
        if ("command".equals(request.getActionType())) {
            commandLogService.logCommand(user.getId(), request.getInputValue());
        }

        UserStoryProgress progress =
                userStoryProgressRepository
                        .findById(user.getId())
                        .orElseThrow(() -> new CustomException(ErrorCode.E3003));

        StoryNode currentNode = progress.getLatestNode();

        List<StoryTransition> transitions =
                storyTransitionRepository.findByFromNode_IdOrderByPriorityDesc(currentNode.getId());

        // 매칭 시도 (여기서 실패하여 예외가 발생하더라도 위에서 기록한 로그는 남습니다.)
        StoryTransition matched =
                transitions.stream()
                        .filter(t -> matchesTransition(t, request))
                        .findFirst()
                        .orElseThrow(() -> new CustomException(ErrorCode.A1001));

        StoryNode nextNode = matched.getToNode();
        Chapter chapter = nextNode.getChapter();
        JsonNode snapshot = createEmptySnapshot(chapter, nextNode);

        progress.updateProgress(chapter, nextNode, snapshot);
        userStoryProgressRepository.save(progress);

        log.info(
                "Transition: {} -> {} (action={}, input={})",
                currentNode.getCode(),
                nextNode.getCode(),
                request.getActionType(),
                request.getInputValue());

        return TransitionResponseDto.from(nextNode);
    }

    @Override
    public List<String> getRecentCommands() {
        User user = findGuestUser();
        return commandLogService.getRecentCommands(user.getId());
    }

    /**
     * 현재 로컬 테스트용으로 설정된 더미 게스트 유저를 조회합니다.
     *
     * @return 게스트 유저 엔티티
     */
    private User findGuestUser() {
        return userRepository
                .findByEmail(GUEST_EMAIL)
                .orElseThrow(() -> new CustomException(ErrorCode.E3000));
    }

    /**
     * 특정 전이 조건이 사용자의 요청값과 일치하는지 검증합니다.
     *
     * @param t 전이 조건 엔티티
     * @param request 사용자의 요청 데이터
     * @return 일치 여부
     */
    private boolean matchesTransition(StoryTransition t, TransitionRequestDto request) {
        if (!t.getActionType().equals(request.getActionType())) {
            return false;
        }

        return switch (t.getValidatorType()) {
            case "exact" -> request.getInputValue().equals(t.getExpectedInput());
            case "regex" -> request.getInputValue().matches(t.getExpectedInput());
            default -> false;
        };
    }

    /**
     * 사용자의 현재 진행 상태를 저장하기 위한 기본 스냅샷 데이터를 생성합니다.
     *
     * @param chapter 현재 챕터
     * @param node 현재 노드
     * @return JSON 형식의 스냅샷 데이터
     */
    private JsonNode createEmptySnapshot(Chapter chapter, StoryNode node) {
        ObjectNode snapshot = objectMapper.createObjectNode();
        snapshot.put("chapterId", chapter.getId());
        snapshot.put("nodeId", node.getId());
        snapshot.put("nodeCode", node.getCode());
        return snapshot;
    }
}
