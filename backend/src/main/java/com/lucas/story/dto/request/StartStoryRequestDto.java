package com.lucas.story.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class StartStoryRequestDto {

  @NotBlank(message = "해시값은 필수입니다.")
  private String uriHash;
}
