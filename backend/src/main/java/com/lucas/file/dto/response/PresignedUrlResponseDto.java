package com.lucas.file.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PresignedUrlResponseDto {

    private String uploadUrl;
    private String objectKey;
    private String accessUrl;
}
