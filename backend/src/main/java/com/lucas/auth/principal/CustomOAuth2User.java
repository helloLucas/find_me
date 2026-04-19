package com.lucas.auth.principal;

import com.lucas.auth.entity.AuthProvider;
import com.lucas.auth.entity.UserRole;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;

import java.util.Collection;
import java.util.Map;

@Getter
public class CustomOAuth2User extends DefaultOAuth2User {

    private final Long userId;
    private final String email;
    private final AuthProvider provider;
    private final String providerUserId;
    private final UserRole role;

    public CustomOAuth2User(Collection<? extends GrantedAuthority> authorities,
                            Map<String, Object> attributes,
                            String nameAttributeKey,
                            Long userId,
                            String email,
                            AuthProvider provider,
                            String providerUserId,
                            UserRole role) {
        super(authorities, attributes, nameAttributeKey);
        this.userId = userId;
        this.email = email;
        this.provider = provider;
        this.providerUserId = providerUserId;
        this.role = role;
    }
}
