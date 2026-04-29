package com.lucas.story.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Getter
@Table(
    name = "story_transitions",
    uniqueConstraints =
        @UniqueConstraint(
            name = "uk_story_transitions_natural_key",
            columnNames = {"from_node_id", "action_type", "expected_input", "validator_type"}))
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class StoryTransition {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "from_node_id", nullable = false)
  private StoryNode fromNode;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "to_node_id", nullable = false)
  private StoryNode toNode;

  @Column(name = "action_type", nullable = false, length = 50)
  private String actionType;

  @Column(name = "expected_input", columnDefinition = "TEXT")
  private String expectedInput;

  @Column(name = "validator_type", nullable = false, length = 50)
  private String validatorType;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "validator_config", columnDefinition = "jsonb")
  private JsonNode validatorConfig;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "fail_node_id")
  private StoryNode failNode;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "effect_bundle", columnDefinition = "jsonb")
  private JsonNode effectBundle;

  @Column(nullable = false)
  private Integer priority;

  @CreatedDate
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Builder
  public StoryTransition(
      StoryNode fromNode,
      StoryNode toNode,
      String actionType,
      String expectedInput,
      String validatorType,
      JsonNode validatorConfig,
      StoryNode failNode,
      JsonNode effectBundle,
      Integer priority) {
    this.fromNode = fromNode;
    this.toNode = toNode;
    this.actionType = actionType;
    this.expectedInput = expectedInput;
    this.validatorType = validatorType;
    this.validatorConfig = validatorConfig;
    this.failNode = failNode;
    this.effectBundle = effectBundle;
    this.priority = (priority == null) ? 0 : priority;
  }
}
