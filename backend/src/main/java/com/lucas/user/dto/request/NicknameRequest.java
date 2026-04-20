package com.lucas.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 닉네임 수정 요청 정보를 담는 DTO 클래스입니다.
 */
@Getter
@NoArgsConstructor
public class NicknameRequest {

    /** 수정할 닉네임 문자열 */
    @NotBlank(message = "닉네임은 필수입니다.")
    @Size(max = 50, message = "닉네임은 50자 이하로 입력해주세요.")
    private String nickname;
}
