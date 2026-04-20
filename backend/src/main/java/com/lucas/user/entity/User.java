package com.lucas.user.entity;

import com.lucas.auth.entity.AuthProvider;
import com.lucas.auth.entity.UserRole;
import com.lucas.global.util.BaseEntity;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 시스템의 사용자 정보를 담는 엔티티 클래스입니다. 이메일, 닉네임, 인증 제공자 정보 및 권한 정보를 관리합니다. */
@Entity
@Getter
@NoArgsConstructor
@Table(
        name = "users",
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uk_users_provider_provider_user_id",
                    columnNames = {"provider", "provider_user_id"})
        })
public class User extends BaseEntity {

    /** 애플리케이션 유저 식별값 (PK) */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 사용자 이메일 (소셜 로그인 제공자로부터 획득) */
    @Column(name = "email", length = 255)
    private String email;

    /** 소셜 로그인 시 제공받은 원본 이름 */
    @Column(name = "oauth_name", length = 50, nullable = false)
    private String oauthName;

    /** 애플리케이션 내에서 사용하는 유효 닉네임 */
    @Column(name = "nickname", length = 50)
    private String nickname;

    /** 소셜 로그인 인증 제공자 (GOOGLE 등) */
    @Enumerated(EnumType.STRING)
    @Column(name = "provider", length = 30)
    private AuthProvider provider;

    /** 인증 제공자 측의 고유 유저 식별값 */
    @Column(name = "provider_user_id", length = 100)
    private String providerUserId;

    /** 사용자의 권한 상태 (GUEST, MEMBER) */
    @Enumerated(EnumType.STRING)
    @Column(name = "role", length = 20, nullable = false)
    private UserRole role;

    /**
     * User 엔티티 생성을 위한 빌더 패턴 생성자입니다.
     *
     * @param email 사용자 이메일
     * @param oauthName 소셜 실명
     * @param nickname 애플리케이션 닉네임
     * @param provider 인증 제공자
     * @param providerUserId 제공자 측 식별값
     * @param role 유저 권한 (제공되지 않을 경우 기본 GUEST)
     */
    @Builder
    public User(
            String email,
            String oauthName,
            String nickname,
            AuthProvider provider,
            String providerUserId,
            UserRole role) {
        this.email = email;
        this.oauthName = oauthName;
        this.nickname = nickname;
        this.provider = provider;
        this.providerUserId = providerUserId;
        this.role = role != null ? role : UserRole.GUEST;
    }

    /**
     * 사용자의 닉네임을 업데이트합니다.
     *
     * @param nickname 변경할 새로운 닉네임
     */
    public void updateNickname(String nickname) {
        this.nickname = nickname;
    }

    /**
     * 게스트 사용자를 정식 회원으로 승격시킵니다. 소셜 로그인 연동 정보를 기록하고 상태를 MEMBER로 변경합니다.
     *
     * @param email 사용자 이메일
     * @param oauthName 소셜 실명
     * @param provider 인증 제공자
     * @param providerUserId 제공자 측 식별값
     */
    public void upgradeToMember(
            String email, String oauthName, AuthProvider provider, String providerUserId) {
        this.email = email;
        this.oauthName = oauthName;
        this.provider = provider;
        this.providerUserId = providerUserId;
        this.role = UserRole.MEMBER;
    }
}
