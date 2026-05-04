package com.lucas.auth.repository;

import com.lucas.auth.entity.AuthProvider;
import com.lucas.auth.entity.SocialLogin;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** SocialLogin 엔티티에 대한 데이터 액세스를 담당하는 레포지토리 인터페이스입니다. */
@Repository
public interface SocialLoginRepository extends JpaRepository<SocialLogin, Long> {

  /**
   * 소셜 제공자와 제공자 측 유저 식별값으로 소셜 로그인 레코드를 조회합니다.
   *
   * @param provider       인증 제공자 (GOOGLE, SSAFY 등)
   * @param providerUserId 제공자 측 유저 식별값
   * @return 조회된 SocialLogin 정보를 포함한 Optional 객체
   */
  Optional<SocialLogin> findByProviderAndProviderUserId(AuthProvider provider, String providerUserId);
}
