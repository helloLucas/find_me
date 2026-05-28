package com.lucas.auth.entity;

import com.lucas.global.util.BaseEntity;
import com.lucas.user.entity.User;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 소셜 로그인 인증 수단을 별도로 관리하는 엔티티입니다.
 *
 * <p>하나의 {@link User}가 여러 소셜 제공자(Google, ***** 등)로 로그인할 수 있도록 유저 본체와 인증 수단을 1:N으로 분리합니다.
 */
@Entity
@Getter
@NoArgsConstructor
@Table(
    name = "social_logins",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uk_social_logins_provider_provider_user_id",
          columnNames = {"provider", "provider_user_id"})
    })
public class SocialLogin extends BaseEntity {

  /** 소셜 로그인 레코드 식별값 (PK) */
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  /** 연결된 사용자 (FK) */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  /** 소셜 로그인 인증 제공자 (GOOGLE, ***** 등) */
  @Enumerated(EnumType.STRING)
  @Column(name = "provider", length = 30, nullable = false)
  private AuthProvider provider;

  /** 인증 제공자 측의 고유 유저 식별값 */
  @Column(name = "provider_user_id", length = 100, nullable = false)
  private String providerUserId;

  /**
   * SocialLogin 엔티티 생성을 위한 빌더 패턴 생성자입니다.
   *
   * @param user 연결할 User 엔티티
   * @param provider 인증 제공자
   * @param providerUserId 제공자 측 유저 식별값
   */
  @Builder
  public SocialLogin(User user, AuthProvider provider, String providerUserId) {
    this.user = user;
    this.provider = provider;
    this.providerUserId = providerUserId;
  }
}
