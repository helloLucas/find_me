package com.lucas.hint.service;

import com.lucas.hint.dto.response.HintEsSignalResponseDto;
import java.util.Optional;

/** ES가 연결된 환경에서 노드별 실패/반복 오답 집계 신호를 조회한다. */
public interface HintEsSignalService {

  Optional<HintEsSignalResponseDto> loadSignals(
      String chapterCode, String fromNodeCode, String actionType);
}

