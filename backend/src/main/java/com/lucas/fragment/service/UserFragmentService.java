package com.lucas.fragment.service;

import com.lucas.fragment.entity.UserFragment;
import com.lucas.fragment.repository.UserFragmentRepository;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserFragmentService {

  private final UserFragmentRepository userFragmentRepository;
  private final UserRepository userRepository;
  private final MinigameSessionService minigameSessionService;

  public boolean hasFragment(Long userId, String fragmentCode) {
    return userFragmentRepository.existsByUserIdAndFragmentCode(userId, fragmentCode);
  }

  @Transactional
  public void acquireFragment(Long userId, String fragmentCode, String sessionId) {
    // 1. 미니게임 세션 검증 (최소 플레이 시간 등)
    // 각 프래그먼트별로 다른 최소 시간을 설정할 수 있지만, 여기서는 기본적으로 1초로 설정합니다. (테스트 편의성 및 빠른 플레이어 대응)
    long minDurationMs = 1000; // 1초
    // Cyber Packet Dash (code=3) 같은 경우 60초가 소요되지만, 테스트 편의를 위해 1초로 유지합니다.

    if (!minigameSessionService.verifySession(userId, fragmentCode, sessionId, minDurationMs)) {
      log.warn(
          "Minigame session verification failed for user: {}, fragment: {}, session: {}",
          userId,
          fragmentCode,
          sessionId);
      throw new com.lucas.global.exception.CustomException(
          com.lucas.global.exception.ErrorCode.A1001);
    }

    try {
      if (!userFragmentRepository.existsByUserIdAndFragmentCode(userId, fragmentCode)) {
        User user = userRepository.getReferenceById(userId);
        UserFragment fragment =
            UserFragment.builder().user(user).fragmentCode(fragmentCode).build();
        userFragmentRepository.saveAndFlush(fragment);
      }
    } catch (DataIntegrityViolationException e) {
      // Duplicate insert attempted due to concurrency, safely ignore since the fragment is already
      // acquired
    }
  }
}
