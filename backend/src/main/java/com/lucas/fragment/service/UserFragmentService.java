package com.lucas.fragment.service;

import com.lucas.fragment.entity.UserFragment;
import com.lucas.fragment.repository.UserFragmentRepository;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserFragmentService {

    private final UserFragmentRepository userFragmentRepository;
    private final UserRepository userRepository;

    public boolean hasFragment(Long userId, String fragmentCode) {
        return userFragmentRepository.existsByUserIdAndFragmentCode(userId, fragmentCode);
    }

    @Transactional
    public void acquireFragment(Long userId, String fragmentCode) {
        try {
            if (!userFragmentRepository.existsByUserIdAndFragmentCode(userId, fragmentCode)) {
                User user = userRepository.getReferenceById(userId);
                UserFragment fragment = UserFragment.builder()
                        .user(user)
                        .fragmentCode(fragmentCode)
                        .build();
                userFragmentRepository.saveAndFlush(fragment);
            }
        } catch (DataIntegrityViolationException e) {
            // Duplicate insert attempted due to concurrency, safely ignore since the fragment is already acquired
        }
    }
}
