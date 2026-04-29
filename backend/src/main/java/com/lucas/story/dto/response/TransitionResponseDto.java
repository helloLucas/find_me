package com.lucas.story.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Map;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TransitionResponseDto {

  private NextNodeDto nextNode;
  private Map<String, Object> snapshot;
  private List<EffectDto> effects;
  private String result;
  private TerminalResultDto terminalResult;

  @Getter
  @Builder
  public static class NextNodeDto {
    private Long id;
    private String code;
    private String nodeType;
    private JsonNode outputBundle;
    private String promptType;
    private JsonNode promptMeta;
    private boolean isCheckpoint;
    private boolean isTerminal;
  }

  @Getter
  @Builder
  public static class EffectDto {
    private String type;
    private Object payload;
  }

  @Getter
  @Builder
  public static class TerminalResultDto {
    private List<String> stdout;
    private List<String> stderr;
    private String cwd;
    private String prompt;
    private String resultCode;
  }
}
