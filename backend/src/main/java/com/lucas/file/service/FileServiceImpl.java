package com.lucas.file.service;

import com.lucas.file.dto.request.DownloadPresignedUrlRequestDto;
import com.lucas.file.dto.request.PresignedUrlRequestDto;
import com.lucas.file.dto.response.DownloadPresignedUrlResponseDto;
import com.lucas.file.dto.response.PresignedUrlResponseDto;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileServiceImpl implements FileService {

    private final S3Presigner s3Presigner;
    private final S3Client s3Client;

    @Value("${cloud.aws.s3.bucket}")
    private String bucketName;

    @Value("${cloud.aws.cdn.url:}")
    private String cdnUrl;

    @Value("${cloud.aws.region.static}")
    private String region;

    @Override
    public PresignedUrlResponseDto getUploadPresignedUrl(PresignedUrlRequestDto request) {
        String fileName = request.getFileName();
        String contentType = request.getContentType();

        // 안전망 검증
        if (fileName == null || fileName.isBlank() || contentType == null || contentType.isBlank()) {
            throw new CustomException(ErrorCode.H1000);
        }

        String objectKey = generateObjectKey(fileName);

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(5))
                .putObjectRequest(putObjectRequest)
                .build();

        PresignedPutObjectRequest presignedPutObjectRequest = s3Presigner.presignPutObject(presignRequest);
        String uploadUrl = presignedPutObjectRequest.url().toString();

        String accessUrl = generateAccessUrl(objectKey);

        return PresignedUrlResponseDto.builder()
                .uploadUrl(uploadUrl)
                .objectKey(objectKey)
                .accessUrl(accessUrl)
                .build();
    }

  @Override
  public DownloadPresignedUrlResponseDto getDownloadPresignedUrl(DownloadPresignedUrlRequestDto request) {
    String objectKey = request.getObjectKey();

    if (objectKey == null || objectKey.isBlank()) {
      throw new CustomException(ErrorCode.H1000);
    }

    try {
      // 파일 존재 여부 확인
      s3Client.headObject(
          HeadObjectRequest.builder()
              .bucket(bucketName)
              .key(objectKey)
              .build()
      );

      GetObjectRequest getObjectRequest = GetObjectRequest.builder()
          .bucket(bucketName)
          .key(objectKey)
          .build();

      GetObjectPresignRequest getObjectPresignRequest = GetObjectPresignRequest.builder()
          .signatureDuration(Duration.ofMinutes(5))
          .getObjectRequest(getObjectRequest)
          .build();

      PresignedGetObjectRequest presignedGetObjectRequest =
          s3Presigner.presignGetObject(getObjectPresignRequest);

      return DownloadPresignedUrlResponseDto.builder()
          .downloadUrl(presignedGetObjectRequest.url().toString())
          .objectKey(objectKey)
          .build();

    } catch (S3Exception e) {
      log.error("다운로드 Presigned URL 발급 실패. objectKey={}, statusCode={}, message={}",
          objectKey, e.statusCode(), e.awsErrorDetails() != null ? e.awsErrorDetails().errorMessage() : e.getMessage(), e);

      // 상태 코드에 따라 구체적인 예외로 변환
      if (e.statusCode() == 404) {
          throw new CustomException(ErrorCode.E3004);
      } else if (e.statusCode() == 403) {
          throw new CustomException(ErrorCode.A1004);
      }

      // 그 외의 경우 공통 서버 오류 발생
      throw new CustomException(ErrorCode.G1000);
    }
  }


    private String generateObjectKey(String originalFileName) {
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        String uuid = UUID.randomUUID().toString();

        String extension = "";
        int dotIndex = originalFileName.lastIndexOf(".");
        if (dotIndex > 0) {
            extension = originalFileName.substring(dotIndex);
        }

        return String.format("%s/%s%s", datePath, uuid, extension);
    }

    private String generateAccessUrl(String objectKey) {
        if (cdnUrl != null && !cdnUrl.isBlank()) {
            String baseUrl = cdnUrl.endsWith("/") ? cdnUrl : cdnUrl + "/";
            return baseUrl + objectKey;
        } else {
            return String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, objectKey);
        }
    }

}
