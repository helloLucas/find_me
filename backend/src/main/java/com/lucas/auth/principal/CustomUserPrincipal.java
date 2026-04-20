package com.lucas.auth.principal;

import com.lucas.auth.entity.UserRole;
import java.util.Collection;
import java.util.Collections;
import lombok.Builder;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/** JWT 토큰을 파싱한 후 SecurityContextHolder에 저장될 인증 주체 정보 클래스입니다. */
@Getter
@Builder
public class CustomUserPrincipal {

    /** 애플리케이션 내부 유저 식별값 */
    private Long userId;

    /** 유저 이메일 */
    private String email;

    /** 유저 닉네임 */
    private String nickname;

    /** 유저 권한 */
    private UserRole role;

    /**
     * 사용자의 권한 목록을 반환합니다.
     *
     * @return GrantedAuthority 컬렉션
     */
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singleton(new SimpleGrantedAuthority(role.getKey()));
    }
}
