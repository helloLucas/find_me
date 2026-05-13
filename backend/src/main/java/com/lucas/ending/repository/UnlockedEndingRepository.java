package com.lucas.ending.repository;

import com.lucas.ending.entity.UnlockedEnding;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 해금된 엔딩 레코드에 접근하는 Repository입니다.
 *
 * <p>엔딩 해금은 같은 사용자가 같은 엔딩에 재진입할 수 있는 흐름이므로, 중복 insert 예외 대신 PostgreSQL의 {@code ON CONFLICT DO
 * NOTHING}을 사용합니다.
 */
public interface UnlockedEndingRepository extends JpaRepository<UnlockedEnding, Long> {

  /**
   * 사용자별 해금 엔딩 목록을 해금 시각 오름차순으로 조회합니다.
   *
   * @param userId 조회할 사용자 id
   * @return 사용자가 해금한 엔딩 레코드 목록
   */
  List<UnlockedEnding> findAllByUserIdOrderByUnlockedAtAsc(Long userId);

  /**
   * 사용자가 특정 엔딩을 이미 해금했는지 확인합니다.
   *
   * @param userId 조회할 사용자 id
   * @param endingType 확인할 엔딩 타입
   * @return 해당 엔딩을 해금했으면 true
   */
  boolean existsByUserIdAndEndingType(Long userId, String endingType);

  /**
   * 사용자별 엔딩 해금 레코드를 중복 없이 저장합니다.
   *
   * <p>{@code unlocked_endings} 테이블의 {@code (user_id, ending_type)} 유니크 제약을 기준으로 이미 해금된 엔딩이면 아무 작업도
   * 하지 않습니다.
   *
   * @param userId 엔딩을 해금한 사용자 id
   * @param endingType 해금할 엔딩 타입
   * @return 새로 insert 되었으면 1, 이미 존재해서 무시되었으면 0
   */
  @Modifying
  @Query(
      value =
          """
          INSERT INTO unlocked_endings (user_id, ending_type, unlocked_at)
          VALUES (:userId, :endingType, NOW())
          ON CONFLICT (user_id, ending_type) DO NOTHING
          """,
      nativeQuery = true)
  int insertIgnore(@Param("userId") Long userId, @Param("endingType") String endingType);
}
