package com.lucas.chapter.repository;

import com.lucas.chapter.entity.Chapter;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChapterRepository extends JpaRepository<Chapter, Long> {

    Optional<Chapter> findByCode(String code);
}
