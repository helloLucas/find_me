package com.lucas.global.service;

import com.lucas.bugreport.dto.request.BugReportRequest;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import java.io.UnsupportedEncodingException;
import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {

    private final JavaMailSender javaMailSender;

    @Value("${spring.mail.username}")
    private String adminEmail;

    public record MailAttachment(String filename, byte[] data) {
    }

    @Async
    public void sendBugReport(
            Long userId, BugReportRequest request, List<MailAttachment> attachments) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String subject = "[시스템 로그 접수] " + request.getTitle();

            // 1. 데이터 사전 가공 (null 처리 및 줄바꿈 변환을 미리 수행하여 가독성 향상)
            String reportTitle = request.getTitle() != null ? request.getTitle() : "제목 없음"; // ✅ 제목 데이터 추가
            String nickname = request.getNickname() != null ? request.getNickname() : "알 수 없음";
            String currentChapter = request.getCurrentChapter() != null ? request.getCurrentChapter() : "N/A";
            String content = request.getContent() != null ? request.getContent().replace("\n", "<br/>") : "";

            // 2. HTML 템플릿 매핑
            String text = String.format("""
                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333333;">

                                <!-- 헤더 영역 (검은색 두꺼운 밑줄로 강조 및 중앙 정렬) -->
                                <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #111111; margin-bottom: 30px;">
                                    <h2 style="margin: 0; color: #111111; font-size: 22px; font-weight: bold; letter-spacing: -0.5px;">FIND ME 시스템 버그 리포트</h2>
                                </div>

                                <!-- 메타 정보 (배경색 없이 각 항목을 얇은 회색 밑줄로 구분) -->
                                <table width="100%%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; margin-bottom: 40px;">
                                    <tr>
                                        <td style="padding: 14px 0; width: 120px; color: #666666; font-size: 14px; border-bottom: 1px solid #eeeeee;">신고자 ID</td>
                                        <td style="padding: 14px 0; color: #111111; font-size: 15px; font-weight: bold; border-bottom: 1px solid #eeeeee;">%d</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 14px 0; color: #666666; font-size: 14px; border-bottom: 1px solid #eeeeee;">신고자 닉네임</td>
                                        <td style="padding: 14px 0; color: #111111; font-size: 15px; font-weight: bold; border-bottom: 1px solid #eeeeee;">%s</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 14px 0; color: #666666; font-size: 14px; border-bottom: 1px solid #eeeeee;">현재 챕터</td>
                                        <td style="padding: 14px 0; color: #111111; font-size: 15px; font-weight: bold; border-bottom: 1px solid #eeeeee;">%s</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 14px 0; color: #666666; font-size: 14px; border-bottom: 1px solid #eeeeee;">제목</td>
                                        <td style="padding: 14px 0; color: #111111; font-size: 15px; font-weight: bold; border-bottom: 1px solid #eeeeee;">%s</td>
                                    </tr>
                                </table>

                                <!-- 유저 작성 내용 (제목 아래 얇은 선으로 구역 분리) -->
                                <div style="margin-bottom: 40px;">
                                    <h3 style="margin: 0 0 15px 0; color: #111111; font-size: 16px; border-bottom: 1px solid #111111; padding-bottom: 10px; display: inline-block;">상세 내용</h3>
                                    <div style="padding-top: 5px; line-height: 1.6; color: #333333; font-size: 15px;">
                                        %s
                                    </div>
                                </div>

                                <!-- 푸터 영역 (연한 윗줄로 마무리) -->
                                <div style="padding-top: 20px; border-top: 1px solid #eeeeee; text-align: center; color: #999999; font-size: 12px;">
                                    본 메일은 FIND ME 시스템에 의해 자동 발송되었습니다.
                                </div>
                            </div>
                            """,
                    userId, nickname, currentChapter, reportTitle, content
            );

            helper.setTo(adminEmail);
            helper.setSubject(subject);
            helper.setText(text, true); // true = HTML 형식 적용

            try {
                helper.setFrom(adminEmail, "FIND ME 시스템"); // 관리자 이메일과 발송자 닉네임 설정
            } catch (UnsupportedEncodingException e) {
                helper.setFrom(adminEmail);
            }

            if (attachments != null && !attachments.isEmpty()) {
                for (MailAttachment attachment : attachments) {
                    helper.addAttachment(attachment.filename(), new ByteArrayResource(attachment.data()));
                }
            }

            javaMailSender.send(message);
            log.info("Bug report email sent successfully from User ID: {}", userId);

        } catch (MessagingException e) {
            log.error("Failed to send bug report email", e);
        }
    }
}
