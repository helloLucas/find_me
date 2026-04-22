package com.lucas.fragment.repository;

import com.lucas.fragment.entity.UserFragment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserFragmentRepository extends JpaRepository<UserFragment, Long> {
    boolean existsByUserIdAndFragmentCode(Long userId, String fragmentCode);
}
