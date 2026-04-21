package com.lucas.file.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DownloadPresignedUrlResponseDto {

  private String downloadUrl;
  private String objectKey;
}
