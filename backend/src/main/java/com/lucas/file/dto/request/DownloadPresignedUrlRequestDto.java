package com.lucas.file.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class DownloadPresignedUrlRequestDto {

  @NotBlank(message = "objectKey는 필수입니다.")
  private String objectKey;
}
