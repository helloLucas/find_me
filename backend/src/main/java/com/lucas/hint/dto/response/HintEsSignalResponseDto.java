package com.lucas.hint.dto.response;

import java.util.List;
import lombok.Builder;
import lombok.Getter;

/** Elasticsearch 집계 신호를 요약해 전달하는 DTO다. */
@Getter
@Builder
public class HintEsSignalResponseDto {

  private long totalActionCount;
  private long failActionCount;
  private double nodeFailRate;
  private double hintRequestRate;
  private List<String> topWrongInputs;
}

