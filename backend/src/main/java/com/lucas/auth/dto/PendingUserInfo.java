package com.lucas.auth.dto;

import com.lucas.auth.entity.AuthProvider;
import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 최종 가입(닉네임 입력) 전까지 Redis에 임시로 보관되는 사용자 정보 DTO입니다. 소셜 로그인 직후 또는 게스트 세션 생성 시 발급된 tempKey와 매핑되어
 * 저장됩니다.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingUserInfo implements Serializable {

  /** 사용자 이메일 (소셜 로그인 시 획득) */
  private String email;

  /** 소셜 로그인 인증 제공자 (GOOGLE, SSAFY 등) */
  private AuthProvider provider;

  /** 인증 제공자 측의 고유 유저 식별값 */
  private String providerUserId;

  /** 소셜 서비스에서 제공받은 사용자의 실제 이름 */
  private String oauthName;

  /** 게스트 여부 플래그 (true일 경우 게스트 가입 대기 상태) */
  private boolean guest;

  /** 충돌 상황(승격 시도 중 소셜 계정 발견) 시 기존 멤버의 PK */
  private Long existingMemberId;
}
