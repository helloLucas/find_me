package com.lucas.file.controller;

import com.lucas.file.dto.request.DownloadPresignedUrlRequestDto;
import com.lucas.file.dto.request.PresignedUrlRequestDto;
import com.lucas.file.dto.response.DownloadPresignedUrlResponseDto;
import com.lucas.file.dto.response.PresignedUrlResponseDto;
import com.lucas.file.service.FileService;
import com.lucas.global.dto.BaseResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    @PostMapping("/presigned/uploads")
    public ResponseEntity<BaseResponse<PresignedUrlResponseDto>> getPresignedUrl(
            @Valid @RequestBody PresignedUrlRequestDto request) {

        PresignedUrlResponseDto response = fileService.getUploadPresignedUrl(request);

        return ResponseEntity.ok(BaseResponse.success("Presigned URL for Upload 발급 성공", response));
    }
    @PostMapping("/presigned/downloads")
    public ResponseEntity<BaseResponse<DownloadPresignedUrlResponseDto>> getDownloadPresignedUrl(
        @Valid @RequestBody DownloadPresignedUrlRequestDto request) {

      DownloadPresignedUrlResponseDto response = fileService.getDownloadPresignedUrl(request);

      return ResponseEntity.ok(BaseResponse.success("다운로드 Presigned URL 발급 성공", response));
    }

}
