package com.lucas.story.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import com.lucas.story.entity.StoryNode;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class StoryNodeResponseDto {

  private final Long id;
  private final String nodeCode;
  private final String nodeType;
  private final String promptType;
  private final JsonNode outputBundle;
  private final JsonNode promptMeta;
  private final boolean checkpoint;
  private final boolean terminal;

  public static StoryNodeResponseDto from(StoryNode node) {
    return StoryNodeResponseDto.builder()
        .id(node.getId())
        .nodeCode(node.getCode())
        .nodeType(node.getNodeType())
        .promptType(node.getPromptType())
        .outputBundle(node.getOutputBundle())
        .promptMeta(node.getPromptMeta())
        .checkpoint(node.isCheckpoint())
        .terminal(node.isTerminal())
        .build();
  }
}
