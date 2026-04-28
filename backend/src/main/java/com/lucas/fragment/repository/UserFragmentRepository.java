package com.lucas.fragment.repository;

import com.lucas.fragment.entity.UserFragment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserFragmentRepository extends JpaRepository<UserFragment, Long> {
  boolean existsByUserIdAndFragmentCode(Long userId, String fragmentCode);
}
