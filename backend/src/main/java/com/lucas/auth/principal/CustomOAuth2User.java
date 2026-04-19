package com.lucas.auth.principal;

import com.lucas.auth.entity.AuthProvider;
import com.lucas.auth.entity.UserRole;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

import java.util.Collection;
import java.util.Map;

/**
 * OAuth 로그인 성공 직후 Spring Security가 들고 다니는 "로그인 사용자 정보 객체"
 * JWT 발급할 때 사용 및 Spring Security 내부에서 인증 principal 로 사용
 */
@Getter
public class CustomOAuth2User extends DefaultOAuth2User {

    private final Long userId;
    private final String email;
    private String nickname;
    private final AuthProvider provider;
    private final String providerUserId;
    private final UserRole role;

    /**
     *
     * @param authorities : Spring Security 권한 목록
     * @param attributes : OAuth 제공자(Google)가 준 원본 사용자 정보
     * @param nameAttributeKey : OAuth 사용자 대표 식별 키 이름 (예: Google의 sub)
     * @param userId
     * @param email
     * @param nickname
     * @param provider
     * @param providerUserId
     * @param role
     */
    public CustomOAuth2User(Collection<? extends GrantedAuthority> authorities,
                            Map<String, Object> attributes,
                            String nameAttributeKey,
                            Long userId,
                            String email,
                            String nickname,
                            AuthProvider provider,
                            String providerUserId,
                            UserRole role) {
        super(authorities, attributes, nameAttributeKey);
        this.userId = userId;
        this.email = email;
        this.nickname = nickname;
        this.provider = provider;
        this.providerUserId = providerUserId;
        this.role = role;
    }
}
