package com.lucas.user.service;

import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 사용자 정보와 관련된 비즈니스 로직을 처리하는 서비스 클래스입니다. */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

  private final UserRepository userRepository;

  /**
   * 특정 사용자의 닉네임을 유효성 검사 후 업데이트합니다.
   *
   * @param userId 유저 식별값
   * @param nickname 새로운 닉네임 문자열
   * @throws CustomException 닉네임이 비어있거나 너무 길 경우 발생
   */
  @Transactional
  public void updateNickname(Long userId, String nickname) {
    if (nickname == null || nickname.isBlank()) {
      throw new CustomException(ErrorCode.H1000);
    }

    String trimmedNickname = nickname.trim();
    if (trimmedNickname.length() > 50) {
      throw new CustomException(ErrorCode.H1000);
    }

    User user =
        userRepository.findById(userId).orElseThrow(() -> new CustomException(ErrorCode.E3000));

    user.updateNickname(trimmedNickname);
    log.info("유저 닉네임 업데이트 완료 - userId: {}, nickname: {}", userId, trimmedNickname);
  }
}
