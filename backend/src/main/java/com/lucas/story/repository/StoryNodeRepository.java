package com.lucas.story.repository;

import com.lucas.story.entity.StoryNode;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoryNodeRepository extends JpaRepository<StoryNode, Long> {

  Optional<StoryNode> findByCode(String code);

  /**
   * 챕터 코드와 노드 코드를 함께 사용해 같은 코드가 다른 챕터에 있어도 안전하게 노드를 조회한다.
   *
   * @param chapterCode 조회할 챕터 코드
   * @param code 조회할 스토리 노드 코드
   * @return 조건에 맞는 스토리 노드
   */
  Optional<StoryNode> findByChapter_CodeAndCode(String chapterCode, String code);

  Optional<StoryNode> findFirstByChapter_CodeOrderByIdAsc(String chapterCode);
}
