package com.lucas.story.service.logging;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StoryActionLogEvent {
  @JsonProperty("timestamp")
  private String timestamp;

  @JsonProperty("session_id")
  private String sessionId;

  @JsonProperty("user_id")
  private Long userId;

  @JsonProperty("chapter_id")
  private String chapterId;

  @JsonProperty("from_node_id")
  private String fromNodeId;

  @JsonProperty("to_node_id")
  private String toNodeId;

  @JsonProperty("action_type")
  private String actionType;

  @JsonProperty("input_value")
  private String inputValue;

  @JsonProperty("input_value_norm")
  private String inputValueNorm;

  @JsonProperty("result")
  private String result;

  @JsonProperty("fail_count_after_action")
  private int failCountAfterAction;

  @JsonProperty("hint_requested")
  private boolean hintRequested;

  @JsonProperty("state_version")
  private int stateVersion;
}
