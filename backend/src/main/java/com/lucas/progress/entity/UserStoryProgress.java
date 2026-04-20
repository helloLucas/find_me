package com.lucas.progress.entity;

import com.fasterxml.jackson.databind.JsonNode;
import com.lucas.chapter.entity.Chapter;
import com.lucas.story.entity.StoryNode;
import com.lucas.user.entity.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Getter
@Table(name = "user_story_progress")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class UserStoryProgress {

    @Id private Long userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "latest_chapter_id", nullable = false)
    private Chapter latestChapter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "latest_node_id", nullable = false)
    private StoryNode latestNode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "latest_checkpoint_node_id")
    private StoryNode latestCheckpointNode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "latest_snapshot_json", nullable = false, columnDefinition = "jsonb")
    private JsonNode latestSnapshotJson;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public UserStoryProgress(
            User user,
            Chapter latestChapter,
            StoryNode latestNode,
            StoryNode latestCheckpointNode,
            JsonNode latestSnapshotJson) {
        this.user = user;
        this.latestChapter = latestChapter;
        this.latestNode = latestNode;
        this.latestCheckpointNode = latestCheckpointNode;
        this.latestSnapshotJson = latestSnapshotJson;
    }

    public void updateProgress(Chapter chapter, StoryNode node, JsonNode snapshotJson) {
        this.latestChapter = chapter;
        this.latestNode = node;
        this.latestSnapshotJson = snapshotJson;
        if (node.isCheckpoint()) {
            this.latestCheckpointNode = node;
        }
    }
}
