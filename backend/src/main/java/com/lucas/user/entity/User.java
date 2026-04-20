package com.lucas.user.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Getter
@Table(name = "users")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String email;

    @Column(length = 50)
    private String name;

    @Column(name = "ssafy_id", unique = true)
    private Long ssafyId;

    @Column(length = 50)
    private String region;

    @Column(nullable = false, length = 50)
    private String role;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public User(String email, String name, Long ssafyId, String region, String role) {
        this.email = email;
        this.name = name;
        this.ssafyId = ssafyId;
        this.region = region;
        this.role = role;
    }
}
