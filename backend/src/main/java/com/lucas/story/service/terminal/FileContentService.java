package com.lucas.story.service.terminal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 가상 터미널 파일의 텍스트 내용을 관리하는 서비스 클래스입니다. resources/story/chapter02/contents.json 파일을 로드하여 cat 명령어 실행 시
 * 파일 내용을 제공합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileContentService {

  /** JSON 파싱을 위한 잭슨 오브젝트 맵퍼 */
  private final ObjectMapper objectMapper;

  /** 키별 파일 내용(문장 리스트)을 저장하는 캐시 맵 */
  private final Map<String, List<String>> contentsCache = new HashMap<>();

  /** 서비스 생성 후 초기화 단계에서 contents.json 파일을 읽어 메모리에 로드합니다. */
  @PostConstruct
  public void init() {
    // 클래스패스에서 리소스 파일을 입력 스트림으로 가져옵니다.
    try (InputStream is = getClass().getResourceAsStream("/story/chapter02/contents.json")) {
      if (is == null) {
        // 파일이 없으면 경고 로그를 남기고 종료합니다.
        log.warn("Chapter 2 contents.json not found in resources/story/chapter02/");
        return;
      }

      // JSON 데이터를 트루 구조로 파싱합니다.
      JsonNode root = objectMapper.readTree(is);
      // 최상위 노드의 모든 필드를 순회하며 캐시에 저장합니다.
      root.fields()
          .forEachRemaining(
              entry -> {
                String key = entry.getKey(); // JSON 키 (예: LUCAS_FRAGMENT_01)
                JsonNode value = entry.getValue(); // JSON 값 (문장 배열)
                List<String> lines = new ArrayList<>();
                // 배열 안의 각 요소(텍스트 라인)를 리스트로 변환합니다.
                if (value.isArray()) {
                  value.forEach(line -> lines.add(line.asText()));
                }
                // 변환된 리스트를 메모리 맵에 저장합니다.
                contentsCache.put(key, lines);
              });
      log.info("Loaded {} file contents from contents.json", contentsCache.size());
    } catch (Exception e) {
      // 로드 중 발생한 예외를 로그에 기록합니다.
      log.error("Failed to load contents.json for Chapter 2", e);
    }
  }

  /**
   * 특정 컨텐츠 키에 해당하는 파일 내용을 반환합니다.
   *
   * @param contentKey contents.json에 정의된 키값
   * @return 파일의 텍스트 라인 리스트 (없을 경우 빈 리스트)
   */
  public List<String> getContent(String contentKey) {
    // 캐시 맵에서 키를 조회하고 없으면 빈 리스트를 반환합니다.
    if (contentKey == null || !contentsCache.containsKey(contentKey)) {
      return Collections.emptyList();
    }
    // 저장된 라인 리스트를 반환합니다.
    return contentsCache.get(contentKey);
  }
}
