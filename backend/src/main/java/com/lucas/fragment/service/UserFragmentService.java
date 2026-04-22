package com.lucas.fragment.service;

import com.lucas.fragment.entity.UserFragment;
import com.lucas.fragment.repository.UserFragmentRepository;
import com.lucas.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserFragmentService {

    private final UserFragmentRepository userFragmentRepository;

    public boolean hasFragment(Long userId, String fragmentCode) {
        return userFragmentRepository.existsByUserIdAndFragmentCode(userId, fragmentCode);
    }

    @Transactional
    public void acquireFragment(User user, String fragmentCode) {
        if (!userFragmentRepository.existsByUserIdAndFragmentCode(user.getId(), fragmentCode)) {
            UserFragment fragment = UserFragment.builder()
                    .user(user)
                    .fragmentCode(fragmentCode)
                    .build();
            userFragmentRepository.save(fragment);
        }
    }
}
