package com.lucas.story.repository;

import com.lucas.story.entity.StoryTransition;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoryTransitionRepository extends JpaRepository<StoryTransition, Long> {

  List<StoryTransition> findByFromNode_IdOrderByPriorityDesc(Long fromNodeId);
}
