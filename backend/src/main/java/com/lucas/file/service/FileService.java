package com.lucas.file.service;

import com.lucas.file.dto.request.DownloadPresignedUrlRequestDto;
import com.lucas.file.dto.request.PresignedUrlRequestDto;
import com.lucas.file.dto.response.DownloadPresignedUrlResponseDto;
import com.lucas.file.dto.response.PresignedUrlResponseDto;

public interface FileService {
  PresignedUrlResponseDto getUploadPresignedUrl(PresignedUrlRequestDto request);

  DownloadPresignedUrlResponseDto getDownloadPresignedUrl(DownloadPresignedUrlRequestDto request);
}
