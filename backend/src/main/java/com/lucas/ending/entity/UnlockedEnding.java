package com.lucas.ending.entity;

import com.lucas.user.entity.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 사용자가 해금한 엔딩을 저장하는 JPA 엔티티입니다.
 *
 * <p>하나의 사용자가 같은 엔딩을 여러 번 도달하더라도 카운트가 중복 증가하지 않도록 {@code user_id + ending_type} 조합에 유니크 제약을 둡니다.
 *
 * @see User
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
    name = "unlocked_endings",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "unlocked_endings_user_id_ending_type_key",
          columnNames = {"user_id", "ending_type"})
    })
public class UnlockedEnding {

  /** 해금 엔딩 레코드의 내부 식별자입니다. */
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  /** 엔딩을 해금한 사용자입니다. 목록 조회 시점까지 User 로딩을 미루기 위해 LAZY로 둡니다. */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  /** 스토리 노드의 output_bundle.effects.endingType에 기록된 엔딩 타입입니다. */
  @Column(name = "ending_type", nullable = false, length = 50)
  private String endingType;

  /** 사용자가 해당 엔딩을 최초로 해금한 시각입니다. */
  @Column(name = "unlocked_at", nullable = false)
  private LocalDateTime unlockedAt;

  /**
   * 엔딩 해금 레코드를 생성합니다.
   *
   * <p>{@code unlockedAt}은 persist 직전에 {@link #prePersist()}에서 자동으로 채웁니다.
   *
   * @param user 엔딩을 해금한 사용자
   * @param endingType 해금된 엔딩 타입
   */
  @Builder
  public UnlockedEnding(User user, String endingType) {
    // 사용자별 엔딩 집계를 위해 소유 사용자를 연결합니다.
    this.user = user;

    // 엔딩 분기 식별자는 서비스에서 허용 목록 검증을 마친 값만 들어옵니다.
    this.endingType = endingType;
  }

  /** DB insert 직전에 해금 시각을 현재 서버 시각으로 기록합니다. */
  @PrePersist
  public void prePersist() {
    // 별도 생성자 인자를 받지 않아도 최초 해금 시각이 항상 저장되도록 보장합니다.
    this.unlockedAt = LocalDateTime.now();
  }
}
