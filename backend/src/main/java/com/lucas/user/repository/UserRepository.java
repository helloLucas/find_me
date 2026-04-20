package com.lucas.user.repository;

import com.lucas.auth.entity.AuthProvider;
import com.lucas.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * User 엔티티에 대한 데이터 액세스 처리를 담당하는 레포지토리 인터페이스입니다.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    /**
     * 인증 제공자와 제공자 측 유저 식별값을 통해 사용자를 조회합니다.
     *
     * @param provider 인증 제공자 (GOOGLE 등)
     * @param providerUserId 제공자 측 유저 식별값
     * @return 조회된 유저 정보를 포함한 Optional 객체
     */
    Optional<User> findByProviderAndProviderUserId(AuthProvider provider, String providerUserId);
}
