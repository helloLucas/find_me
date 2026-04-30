package com.lucas.bugreport.controller;

import com.lucas.auth.principal.CustomUserPrincipal;
import com.lucas.bugreport.dto.request.BugReportRequest;
import com.lucas.global.dto.BaseResponse;
import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.global.service.MailService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/bugreports")
@RequiredArgsConstructor
public class BugReportController {

  private final MailService mailService;

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<BaseResponse<Void>> reportBug(
      @AuthenticationPrincipal CustomUserPrincipal principal,
      @Valid @RequestPart("request") BugReportRequest request,
      @RequestPart(value = "files", required = false) List<MultipartFile> files) {

    List<MailService.MailAttachment> attachments = new ArrayList<>();
    if (files != null) {
      for (MultipartFile file : files) {
        if (!file.isEmpty() && file.getOriginalFilename() != null) {
          try {
            attachments.add(
                new MailService.MailAttachment(file.getOriginalFilename(), file.getBytes()));
          } catch (IOException e) {
            throw new CustomException(ErrorCode.G1000);
          }
        }
      }
    }

    mailService.sendBugReport(principal.getUserId(), request, attachments);

    return ResponseEntity.ok(BaseResponse.success("버그 리포트가 관리자에게 성공적으로 전송되었습니다."));
  }
}
