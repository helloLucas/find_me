package com.lucas.story.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class TransitionRequestDto {

  @NotNull(message = "nodeId는 필수입니다.")
  private Long nodeId;

  @NotBlank(message = "actionType은 필수입니다.")
  private String actionType;

  private String inputValue;

  private Map<String, Object> meta;
}
