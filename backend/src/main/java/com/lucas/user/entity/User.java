package com.lucas.user.entity;

import com.lucas.auth.entity.AuthProvider;
import com.lucas.auth.entity.UserRole;
import com.lucas.global.util.BaseEntity;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@Table(
    name = "users",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_users_provider_provider_user_id",
            columnNames = {"provider", "provider_user_id"}
        )
    }
)
public class User extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "oauth_name", length = 50, nullable = false)
    private String oauthName;

    @Column(name = "nickname", length = 50)
    private String nickname;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", length = 30, nullable = false)
    private AuthProvider provider;

    @Column(name = "provider_user_id", length = 100, nullable = false)
    private String providerUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", length = 20, nullable = false)
    private UserRole role;

    @Builder
    public User(String email, String oauthName, String nickname, AuthProvider provider, String providerUserId, UserRole role) {
        this.email = email;
        this.oauthName = oauthName;
        this.nickname = nickname;
        this.provider = provider;
        this.providerUserId = providerUserId;
        this.role = role != null ? role : UserRole.GUEST;
    }

    public void updateNicknameAndRole(String nickname, UserRole role) {
        this.nickname = nickname;
        this.role = role;
    }
}
