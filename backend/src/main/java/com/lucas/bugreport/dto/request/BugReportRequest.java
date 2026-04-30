package com.lucas.bugreport.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class BugReportRequest {
  @NotBlank(message = "제목을 입력해주세요.")
  private String title;

  @NotBlank(message = "내용을 입력해주세요.")
  private String content;

  private String nickname;

  private String currentChapter;
}
