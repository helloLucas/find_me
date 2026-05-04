package com.lucas.user.repository;

import com.lucas.user.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** User 엔티티에 대한 데이터 액세스 처리를 담당하는 레포지토리 인터페이스입니다. */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

  /**
   * 이메일로 사용자를 조회합니다.
   *
   * 소셜 로그인 시 계정 연동(Account Linking) 기준점으로 사용되며, 게스트 유저 조회에도 활용됩니다.
   *
   * @param email 사용자 이메일
   * @return 조회된 유저 정보를 포함한 Optional 객체
   */
  Optional<User> findByEmail(String email);
}
