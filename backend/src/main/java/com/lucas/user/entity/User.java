package com.lucas.user.entity;

import com.lucas.auth.entity.SocialLogin;
import com.lucas.auth.entity.UserRole;
import com.lucas.global.util.BaseEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 시스템의 사용자 정보를 담는 엔티티 클래스입니다. 이메일, 닉네임, 권한 정보를 관리합니다. */
@Entity
@Getter
@NoArgsConstructor
@Table(name = "users")
public class User extends BaseEntity {

  /** 애플리케이션 유저 식별값 (PK) */
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  /** 사용자 이메일 (소셜 로그인 제공자로부터 획득) */
  @Column(name = "email", length = 255)
  private String email;

  /** 소셜 로그인 시 제공받은 원본 이름 */
  @Column(name = "oauth_name", length = 50, nullable = true)
  private String oauthName;

  /** 애플리케이션 내에서 사용하는 유효 닉네임 */
  @Column(name = "nickname", length = 15)
  private String nickname;

  /** 사용자의 권한 상태 (GUEST, MEMBER) */
  @Enumerated(EnumType.STRING)
  @Column(name = "role", length = 20, nullable = false)
  private UserRole role;

  /** 사용자가 성공적으로 로그인한 마지막 시각 */
  @Column(name = "last_login_at")
  private LocalDateTime lastLoginAt;

  /**
   * 이 사용자에 연결된 소셜 로그인 수단 목록입니다.
   *
   * <p>{@code CascadeType.ALL}과 {@code orphanRemoval = true}를 사용하여, User 저장/삭제 시 연관된 SocialLogin
   * 레코드도 함께 관리됩니다.
   */
  @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<SocialLogin> socialLogins = new ArrayList<>();

  /**
   * User 엔티티 생성을 위한 빌더 패턴 생성자입니다.
   *
   * @param email 사용자 이메일
   * @param oauthName 소셜 실명
   * @param nickname 애플리케이션 닉네임
   * @param role 유저 권한 (제공되지 않을 경우 기본 GUEST)
   */
  @Builder
  public User(String email, String oauthName, String nickname, UserRole role) {
    this.email = email;
    this.oauthName = oauthName;
    this.nickname = nickname;
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
   * 게스트 사용자를 정식 회원으로 승격시킵니다. 소셜 인증 수단(SocialLogin)은 별도로 추가해야 합니다.
   *
   * @param email 사용자 이메일
   * @param oauthName 소셜 실명
   */
  public void upgradeToMember(String email, String oauthName) {
    this.email = email;
    this.oauthName = oauthName;
    this.role = UserRole.MEMBER;
  }
}
