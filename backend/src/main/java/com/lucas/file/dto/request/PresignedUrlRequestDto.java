package com.lucas.file.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PresignedUrlRequestDto {

    @NotBlank(message = "파일 이름은 필수입니다.")
    private String fileName;

    @NotBlank(message = "Content-Type은 필수입니다 (예: image/jpeg).")
    private String contentType;
}
