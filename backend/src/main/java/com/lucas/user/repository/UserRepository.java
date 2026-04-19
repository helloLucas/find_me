package com.lucas.user.repository;

import com.lucas.auth.entity.AuthProvider;
import com.lucas.user.entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<Users, Long> {
    Optional<Users> findByProviderAndProviderUserId(AuthProvider provider, String providerUserId);

}
