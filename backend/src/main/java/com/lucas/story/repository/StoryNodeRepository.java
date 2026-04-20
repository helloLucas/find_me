package com.lucas.story.repository;

import com.lucas.story.entity.StoryNode;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoryNodeRepository extends JpaRepository<StoryNode, Long> {

    Optional<StoryNode> findByCode(String code);

    Optional<StoryNode> findFirstByChapter_CodeOrderByIdAsc(String chapterCode);
}
