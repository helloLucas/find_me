package com.lucas.user.service;

import com.lucas.auth.entity.UserRole;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional
    public void registerNickname(Long userId, String nickname) {
        if (nickname == null || nickname.isBlank()) {
            throw new CustomException(ErrorCode.H1000); // 닉네임 유효성 검사 실패
        }

        String trimmedNickname = nickname.trim();

        if (trimmedNickname.length() > 50) {
            throw new CustomException(ErrorCode.H1000); // 닉네임 길이 초과
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.E3000)); // 사용자 조회 실패

        if (user.getRole() != UserRole.GUEST) {
            throw new CustomException(ErrorCode.A1001); // 이미 가입 완료된 경우 상태 전이 불가
        }

        user.updateNicknameAndRole(trimmedNickname, UserRole.USER);

        log.info("사용자 승급 완료 - userId: {}, 닉네임: {}, 역할: {}",
            user.getId(), user.getNickname(), user.getRole());
    }
}
