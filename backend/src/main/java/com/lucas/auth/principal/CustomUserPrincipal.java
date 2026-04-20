package com.lucas.auth.principal;

import com.lucas.auth.entity.UserRole;
import java.util.Collection;
import java.util.Collections;
import lombok.Builder;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@Getter
@Builder
public class CustomUserPrincipal {

    private Long userId;
    private String email;
    private String nickname;
    private UserRole role;

    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singleton(new SimpleGrantedAuthority(role.getKey()));
    }
}
