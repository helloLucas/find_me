package com.lucas.fragment.entity;

import com.lucas.global.util.BaseEntity;
import com.lucas.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
    name = "user_fragments",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_user_fragments_user_id_fragment_code",
            columnNames = {"user_id", "fragment_code"}
        )
    }
)
public class UserFragment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "fragment_code", nullable = false, length = 50)
    private String fragmentCode;

    @Column(name = "acquired_at", nullable = false)
    private LocalDateTime acquiredAt;

    @Builder
    public UserFragment(User user, String fragmentCode) {
        this.user = user;
        this.fragmentCode = fragmentCode;
    }

    @PrePersist
    public void prePersist() {
        this.acquiredAt = LocalDateTime.now();
    }
}
