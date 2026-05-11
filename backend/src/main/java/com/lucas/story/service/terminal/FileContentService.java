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
 * 가상 터미널 파일의 텍스트 내용을 관리하는 서비스 클래스입니다.
 *
 * <p>챕터별 {@code resources/story/chapterXX/contents.json} 파일을 로드하여 {@code cat} 명령어 실행 시 VFS 노드의
 * {@code contentKey}에 맞는 파일 내용을 제공합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileContentService {

  /** JSON 파싱을 위한 잭슨 오브젝트 맵퍼 */
  private final ObjectMapper objectMapper;

  /** 기존 Chapter 2 호출부와의 호환을 위해 사용하는 기본 챕터 코드 */
  private static final String DEFAULT_CHAPTER_CODE = "week02";

  /** 챕터 코드와 컨텐츠 키별 파일 내용(문장 리스트)을 저장하는 캐시 맵 */
  private final Map<String, Map<String, List<String>>> contentsCache = new HashMap<>();

  /** 서비스 생성 후 초기화 단계에서 지원 챕터의 contents.json 파일을 읽어 메모리에 로드합니다. */
  @PostConstruct
  public void init() {
    // 기존 Chapter 2 VFS 파일 내용을 먼저 로드한다.
    loadContentsJson("week02", "/story/chapter02/contents.json");

    // 새 Chapter 3 VFS 파일 내용을 같은 캐시 구조로 로드한다.
    loadContentsJson("week03", "/story/chapter03/contents.json");
  }

  /**
   * classpath의 contents.json 리소스를 읽어 챕터별 컨텐츠 캐시에 저장합니다.
   *
   * @param chapterCode 컨텐츠를 소유한 챕터 코드
   * @param resourcePath classpath 기준 contents.json 리소스 경로
   */
  private void loadContentsJson(String chapterCode, String resourcePath) {
    // classpath 리소스를 InputStream으로 열어 try-with-resources로 안전하게 닫는다.
    try (InputStream is = getClass().getResourceAsStream(resourcePath)) {
      // 리소스가 없으면 서버 시작은 유지하고 해당 챕터 컨텐츠만 비운다.
      if (is == null) {
        log.warn("{} contents.json not found: {}", chapterCode, resourcePath);
        return;
      }

      // JSON을 파싱한 뒤 지원하는 contents 구조를 공통 Map 형태로 변환한다.
      JsonNode root = objectMapper.readTree(is);
      Map<String, List<String>> chapterContents = parseContents(root);

      // 챕터 코드 기준으로 변환된 파일 내용을 캐시에 보관한다.
      contentsCache.put(chapterCode, chapterContents);
      log.info("Loaded {} file contents for {}", chapterContents.size(), chapterCode);
    } catch (Exception e) {
      // 컨텐츠 로딩 실패는 서버 기동을 막지 않고 로그로 남긴다.
      log.error("Failed to load contents.json for {}", chapterCode, e);
    }
  }

  /**
   * contents.json 루트 JSON을 {@code contentKey -> line 목록} 형태로 변환합니다.
   *
   * <p>기존 Chapter 2처럼 최상위 key가 바로 배열인 구조와, 확장 구조인 {@code contents.{key}.lines} 구조를 모두 지원합니다.
   *
   * @param root contents.json 루트 JSON
   * @return 컨텐츠 키별 텍스트 라인 목록
   */
  private Map<String, List<String>> parseContents(JsonNode root) {
    // 확장 포맷이면 contents 객체를 사용하고, 아니면 기존 최상위 객체를 그대로 사용한다.
    JsonNode contentRoot =
        root.has("contents") && root.path("contents").isObject() ? root.path("contents") : root;

    // 변환 결과를 저장할 Map을 준비한다.
    Map<String, List<String>> parsed = new HashMap<>();

    // 각 컨텐츠 키를 순회하며 value를 라인 배열로 정규화한다.
    contentRoot
        .fields()
        .forEachRemaining(
            entry -> {
              // JSON field name을 VFS contentKey와 매칭되는 key로 사용한다.
              String key = entry.getKey();

              // field value는 배열 또는 { lines: [...] } object일 수 있다.
              JsonNode value = entry.getValue();

              // cat 출력은 라인 단위 List<String>으로 통일한다.
              List<String> lines = new ArrayList<>();

              // 기존 포맷: "KEY": ["line1", "line2"]
              if (value.isArray()) {
                value.forEach(line -> lines.add(line.asText()));
              } else if (value.path("lines").isArray()) {
                // 확장 포맷: "KEY": { "lines": ["line1", "line2"] }
                value.path("lines").forEach(line -> lines.add(line.asText()));
              }

              // 알 수 없는 포맷이어도 빈 라인 목록으로 key를 등록해 null 처리를 피한다.
              parsed.put(key, lines);
            });

    // 정규화된 컨텐츠 Map을 반환한다.
    return parsed;
  }

  /**
   * 특정 컨텐츠 키에 해당하는 파일 내용을 반환합니다.
   *
   * @param contentKey contents.json에 정의된 키값
   * @return 파일의 텍스트 라인 리스트 (없을 경우 빈 리스트)
   */
  public List<String> getContent(String contentKey) {
    // 기존 호출부는 Chapter 2 컨텐츠를 기본값으로 조회한다.
    return getContent(DEFAULT_CHAPTER_CODE, contentKey);
  }

  /**
   * 특정 챕터와 컨텐츠 키에 해당하는 파일 내용을 반환합니다.
   *
   * @param chapterCode 챕터 코드
   * @param contentKey contents.json에 정의된 키값
   * @return 파일의 텍스트 라인 리스트 (없을 경우 빈 리스트)
   */
  public List<String> getContent(String chapterCode, String contentKey) {
    // contentKey가 없으면 표시할 파일 내용도 없다.
    if (contentKey == null) {
      return Collections.emptyList();
    }

    // 요청 챕터의 캐시를 우선 사용하고, 없으면 기존 Chapter 2 캐시로 fallback한다.
    Map<String, List<String>> chapterContents =
        contentsCache.getOrDefault(chapterCode, contentsCache.get(DEFAULT_CHAPTER_CODE));

    // 챕터 캐시나 키가 없으면 cat 결과를 빈 출력으로 유지한다.
    if (chapterContents == null || !chapterContents.containsKey(contentKey)) {
      return Collections.emptyList();
    }

    // 찾은 파일 내용을 라인 목록 그대로 반환한다.
    return chapterContents.get(contentKey);
  }
}
