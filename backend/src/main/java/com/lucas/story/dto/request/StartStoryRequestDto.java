package com.lucas.story.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class StartStoryRequestDto {

  @NotBlank(message = "챕터 코드는 필수입니다.")
  private String chapterCode;
}
