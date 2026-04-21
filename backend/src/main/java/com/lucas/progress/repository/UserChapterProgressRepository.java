package com.lucas.progress.repository;

import com.lucas.progress.entity.UserChapterProgress;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserChapterProgressRepository extends JpaRepository<UserChapterProgress, Long> {

  Optional<UserChapterProgress> findByUserIdAndChapterId(Long userId, Long chapterId);

  boolean existsByUserIdAndChapterId(Long userId, Long chapterId);
  
  boolean existsByUserId(Long userId);
}
