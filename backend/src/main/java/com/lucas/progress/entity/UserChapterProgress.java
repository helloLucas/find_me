package com.lucas.progress.entity;

import com.lucas.chapter.entity.Chapter;
import com.lucas.user.entity.User;
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
@Table(
    name = "user_chapter_progress",
    uniqueConstraints = {
      @UniqueConstraint(
          name = "uk_user_chapter_progress_user_chapter",
          columnNames = {"user_id", "chapter_id"})
    })
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class UserChapterProgress {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "chapter_id", nullable = false)
  private Chapter chapter;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 20)
  private ChapterStatus status;

  @CreatedDate
  @Column(name = "unlocked_at", nullable = false, updatable = false)
  private LocalDateTime unlockedAt;

  @Column(name = "completed_at")
  private LocalDateTime completedAt;

  @Builder
  public UserChapterProgress(User user, Chapter chapter, ChapterStatus status) {
    this.user = user;
    this.chapter = chapter;
    this.status = status;
  }

  public void complete() {
    this.status = ChapterStatus.COMPLETED;
    this.completedAt = LocalDateTime.now();
  }

  public void unlock() {
    this.status = ChapterStatus.UNLOCKED;
  }
}
