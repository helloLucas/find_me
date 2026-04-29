package com.lucas.hint.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 실시간 세션 기준 RAG 검색 테스트 요청 DTO입니다.
 *
 * <p>실서비스와 동일한 환경 보장을 위해 override 입력을 받지 않고 sessionId/튜닝 파라미터만 허용합니다.
 */
@Getter
@NoArgsConstructor
public class HintLiveRetrieveRequestDto {

  /** 테스트 대상 세션 ID (미지정 시 sess_user_{userId} 규칙 사용) */
  private String sessionId;

  /** 검색 후보 개수 (searchTopK) */
  @Min(value = 1, message = "searchTopK는 1 이상이어야 합니다.")
  @Max(value = 50, message = "searchTopK는 50 이하여야 합니다.")
  private Integer searchTopK;

  /** LLM 전달 근거 개수 (evidenceLimit) */
  @Min(value = 1, message = "evidenceLimit는 1 이상이어야 합니다.")
  @Max(value = 10, message = "evidenceLimit는 10 이하여야 합니다.")
  private Integer evidenceLimit;

  /** 최소 유사도 임계값 */
  @DecimalMin(value = "0.0", message = "minSimilarity는 0.0 이상이어야 합니다.")
  @DecimalMax(value = "1.0", message = "minSimilarity는 1.0 이하여야 합니다.")
  private Double minSimilarity;
}

