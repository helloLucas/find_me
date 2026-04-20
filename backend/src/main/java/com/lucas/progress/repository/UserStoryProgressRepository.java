package com.lucas.progress.repository;

import com.lucas.progress.entity.UserStoryProgress;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserStoryProgressRepository extends JpaRepository<UserStoryProgress, Long> {}
