package com.lucas.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 신규 회원 가입 또는 게스트의 정식 회원 전환을 처리하기 위한 최종 요청 DTO입니다. 클라이언트에서 닉네임 입력을 완료한 후 이 정보를 서버에 전달합니다. */
@Getter
@NoArgsConstructor
public class UserRegisterRequest {

  /** Redis에서 임시 사용자 정보를 조회하기 위한 식별 키 (UUID) */
  @NotBlank(message = "임시 키는 필수입니다.")
  private String tempKey;

  /** 사용자가 애플리케이션 내에서 사용할 최종 닉네임 (신규 가입 시 필수) */
  private String nickname;

  /** 신규 가입일 경우 null일 수 있습니다. */
  private Long guestId;

  /** 이미 가입된 계정일 경우, 전환(Switch) 여부 확인 플래그 */
  private boolean confirmSwitch;
}
