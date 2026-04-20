package com.lucas.story.entity;

import com.fasterxml.jackson.databind.JsonNode;
import com.lucas.chapter.entity.Chapter;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Getter
@Table(name = "story_nodes")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class StoryNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chapter_id", nullable = false)
    private Chapter chapter;

    @Column(nullable = false, unique = true, length = 100)
    private String code;

    @Column(name = "node_type", nullable = false, length = 50)
    private String nodeType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "output_bundle", nullable = false, columnDefinition = "jsonb")
    private JsonNode outputBundle;

    @Column(name = "prompt_type", length = 50)
    private String promptType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "prompt_meta", columnDefinition = "jsonb")
    private JsonNode promptMeta;

    @Column(name = "is_checkpoint", nullable = false)
    private boolean isCheckpoint;

    @Column(name = "is_terminal", nullable = false)
    private boolean isTerminal;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public StoryNode(
            Chapter chapter,
            String code,
            String nodeType,
            JsonNode outputBundle,
            String promptType,
            JsonNode promptMeta,
            boolean isCheckpoint,
            boolean isTerminal) {
        this.chapter = chapter;
        this.code = code;
        this.nodeType = nodeType;
        this.outputBundle = outputBundle;
        this.promptType = promptType;
        this.promptMeta = promptMeta;
        this.isCheckpoint = isCheckpoint;
        this.isTerminal = isTerminal;
    }
}
