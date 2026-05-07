package com.lucas.story.service.terminal;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** 가상 파일 시스템(VFS)의 현재 유효한 상태를 관리하는 컨텍스트 클래스입니다. 정적 VFS 구조와 유저별 동적 오버레이를 병합하여 최종적인 노드 정보를 제공합니다. */
public class VfsContext {

  /** 정적 VFS 정의 정보 (vfs.json 데이터) */
  private final JsonNode staticVfs;

  /** 유저 세션의 스냅샷에 저장된 동적 파일 오버레이 정보 */
  private final JsonNode vfsOverlay;

  /**
   * 생성자: 정적 VFS와 동적 오버레이를 받아 초기화합니다.
   *
   * @param staticVfs 정적 VFS JSON
   * @param vfsOverlay 동적 오버레이 JSON
   */
  public VfsContext(JsonNode staticVfs, JsonNode vfsOverlay) {
    this.staticVfs = staticVfs;
    this.vfsOverlay = vfsOverlay;
  }

  /**
   * 정적/동적 데이터를 결합한 VfsContext 객체를 생성하는 팩토리 메소드입니다.
   *
   * @param staticVfs 정적 VFS 데이터
   * @param vfsOverlay 유저 스냅샷의 오버레이 데이터
   * @return 생성된 VfsContext 인스턴스
   */
  public static VfsContext of(JsonNode staticVfs, JsonNode vfsOverlay) {
    return new VfsContext(staticVfs, vfsOverlay);
  }

  /**
   * VFS의 최상위 루트 경로를 반환합니다.
   *
   * @return 루트 경로 문자열 (기본값: /home/guest)
   */
  public String getRootPath() {
    // 정적 VFS가 로드되지 않은 경우에도 기본 홈 경로를 반환합니다.
    if (staticVfs == null || staticVfs.isNull()) {
      // Chapter 2 기본 루트 경로입니다.
      return "/home/guest";
    }

    // vfs.json의 rootPath를 우선 사용하고, 없으면 기본 홈 경로를 사용합니다.
    return staticVfs.path("rootPath").asText("/home/guest");
  }

  /**
   * VFS가 속한 챕터 코드를 반환합니다.
   *
   * @return vfs.json의 chapterCode 값, 없으면 기존 Chapter 2 코드
   */
  public String getChapterCode() {
    // 정적 VFS가 없으면 기존 Chapter 2 동작과의 호환을 위해 week02를 반환한다.
    if (staticVfs == null || staticVfs.isNull()) {
      return "week02";
    }

    // vfs.json의 chapterCode를 우선 사용하고, 없으면 week02로 보정한다.
    return staticVfs.path("chapterCode").asText("week02");
  }

  /**
   * VFS 리소스 버전을 반환합니다.
   *
   * @return vfs.json의 vfsVersion 값, 없으면 빈 문자열
   */
  public String getVfsVersion() {
    // 정적 VFS가 없으면 버전 정보를 알 수 없으므로 빈 문자열을 반환한다.
    if (staticVfs == null || staticVfs.isNull()) {
      return "";
    }

    // vfs.json의 vfsVersion 값을 반환한다.
    return staticVfs.path("vfsVersion").asText("");
  }

  /**
   * 기본 작업 디렉터리를 반환합니다.
   *
   * @return vfs.json의 defaultCwd 값, 없으면 VFS 루트 경로
   */
  public String getDefaultCwd() {
    // 정적 VFS가 없으면 안전하게 루트 경로를 기본 cwd로 사용한다.
    if (staticVfs == null || staticVfs.isNull()) {
      return getRootPath();
    }

    // defaultCwd가 없으면 rootPath를 기본 작업 디렉터리로 사용한다.
    return staticVfs.path("defaultCwd").asText(getRootPath());
  }

  /**
   * 터미널 프롬프트 사용자명을 반환합니다.
   *
   * @return vfs.json의 prompt.user 값, 없으면 guest
   */
  public String getPromptUser() {
    // 정적 VFS가 없으면 기존 프롬프트 사용자명을 반환한다.
    if (staticVfs == null || staticVfs.isNull()) {
      return "guest";
    }

    // prompt.user가 없으면 guest를 기본값으로 사용한다.
    return staticVfs.path("prompt").path("user").asText("guest");
  }

  /**
   * 터미널 프롬프트 호스트명을 반환합니다.
   *
   * @return vfs.json의 prompt.host 값, 없으면 lucas-server
   */
  public String getPromptHost() {
    // 정적 VFS가 없으면 기존 프롬프트 호스트명을 반환한다.
    if (staticVfs == null || staticVfs.isNull()) {
      return "lucas-server";
    }

    // prompt.host가 없으면 lucas-server를 기본값으로 사용한다.
    return staticVfs.path("prompt").path("host").asText("lucas-server");
  }

  /**
   * 루트 밖 경로를 차단해야 하는지 반환합니다.
   *
   * @return policies.denyOutsideRoot 값, 없으면 true
   */
  public boolean denyOutsideRoot() {
    // 정적 VFS가 없으면 루트 밖 접근을 차단하는 보수적인 정책을 적용한다.
    if (staticVfs == null || staticVfs.isNull()) {
      return true;
    }

    // vfs.json 정책값이 없으면 차단을 기본값으로 사용한다.
    return staticVfs.path("policies").path("denyOutsideRoot").asBoolean(true);
  }

  /**
   * 루트 밖이어도 접근 가능한 외부 경로인지 확인합니다.
   *
   * @param path 정규화된 절대 경로
   * @return policies.allowedExternalPaths 하위 경로이면 true
   */
  public boolean isAllowedExternalPath(String path) {
    // 비교할 경로 또는 정적 VFS가 없으면 외부 경로를 허용하지 않는다.
    if (path == null || staticVfs == null || staticVfs.isNull()) {
      return false;
    }

    // vfs.json 정책에서 허용 외부 경로 목록을 읽는다.
    JsonNode allowedPaths = staticVfs.path("policies").path("allowedExternalPaths");

    // 허용 목록이 배열이 아니면 외부 경로를 허용하지 않는다.
    if (!allowedPaths.isArray()) {
      return false;
    }

    // 허용된 prefix를 순회하며 현재 경로가 그 하위인지 확인한다.
    for (JsonNode allowedPath : allowedPaths) {
      // 문자열이 아닌 정책 항목은 무시한다.
      if (!allowedPath.isTextual()) {
        continue;
      }

      // 허용 prefix와 정확히 같거나 그 하위 경로인 경우만 허용한다.
      String prefix = allowedPath.asText();
      if (path.equals(prefix) || path.startsWith(prefix + "/")) {
        return true;
      }
    }

    // 어떤 허용 prefix에도 포함되지 않으면 차단 대상이다.
    return false;
  }

  /**
   * 특정 절대 경로에 해당하는 파일 또는 디렉토리 노드를 찾습니다. 동적 오버레이에 변경사항이 있으면 이를 우선적으로 반영합니다.
   *
   * @param path 조회할 절대 경로
   * @return 해당하는 VfsNode 객체 (없을 경우 null)
   */
  public VfsNode resolve(String path) {
    // 1. removedPaths에 있는 경로는 정적/동적 VFS와 무관하게 삭제된 것으로 처리합니다.
    if (isRemovedPath(path)) {
      // 삭제된 경로이므로 존재하지 않는 것으로 반환합니다.
      return null;
    }

    // 2. 배열형 overlay의 createdNodes/modifiedNodes에서 먼저 조회합니다.
    JsonNode arrayOverlayNode = findOverlayArrayNode(path);
    if (arrayOverlayNode != null) {
      // overlay node 정보를 파싱하여 반환합니다.
      return parseNode(path, arrayOverlayNode);
    }

    // 3. 이전 구현과의 호환을 위해 path를 field key로 쓰는 overlay도 지원합니다.
    JsonNode keyedOverlayNode = vfsOverlay == null ? null : vfsOverlay.path(path);
    if (keyedOverlayNode != null && !keyedOverlayNode.isMissingNode()) {
      // 오버레이에 삭제 플래그(deleted: true)가 있으면 없는 것으로 간주합니다.
      if (keyedOverlayNode.path("deleted").asBoolean(false)) {
        // 삭제 플래그가 있으므로 null을 반환합니다.
        return null;
      }

      // keyed overlay node 정보를 파싱하여 반환합니다.
      return parseNode(path, keyedOverlayNode);
    }

    // 4. 오버레이에 없으면 정적 VFS 정의 파일(vfs.json)에서 조회합니다.
    JsonNode staticNode = staticVfs == null ? null : staticVfs.path("nodes").path(path);
    if (staticNode != null && !staticNode.isMissingNode()) {
      // 정적 노드 정보를 파싱하여 반환합니다.
      return parseNode(path, staticNode);
    }

    // 5. 어디에도 존재하지 않는 경로면 null을 반환합니다.
    return null;
  }

  /**
   * 특정 디렉토리 하위의 파일 및 폴더 목록을 조회합니다.
   *
   * @param path 조회할 부모 디렉토리 절대 경로
   * @return 하위 노드 리스트
   */
  public List<VfsNode> listChildren(String path) {
    Map<String, VfsNode> childrenMap = new HashMap<>();

    // 1. 정적 VFS에서 해당 경로로 시작하는 직계 하위 요소들을 수집합니다.
    JsonNode nodes = staticVfs == null ? null : staticVfs.path("nodes");
    if (nodes != null && nodes.isObject()) {
      // 정적 VFS node map을 순회합니다.
      nodes
          .fields()
          .forEachRemaining(
              entry -> {
                String nodePath = entry.getKey();
                // 직계 자식인지 확인 (부모 경로 + / 로 시작하며 그 뒤에 /가 더 없는 경우)
                if (isDirectChild(path, nodePath)) {
                  childrenMap.put(nodePath, parseNode(nodePath, entry.getValue()));
                }
              });
    }

    // 2. 배열형 overlay의 createdNodes를 반영합니다.
    mergeOverlayArrayChildren(childrenMap, path, "createdNodes");

    // 3. 배열형 overlay의 modifiedNodes를 반영합니다.
    mergeOverlayArrayChildren(childrenMap, path, "modifiedNodes");

    // 4. 이전 keyed overlay 구조도 호환 처리합니다.
    mergeKeyedOverlayChildren(childrenMap, path);

    // 5. removedPaths에 있는 직계 하위 요소를 제거합니다.
    removeOverlayChildren(childrenMap, path);

    // 수집된 맵을 리스트로 변환하여 반환합니다.
    return new ArrayList<>(childrenMap.values());
  }

  /**
   * 두 경로 사이의 직계 부모-자식 관계 여부를 확인합니다.
   *
   * @param parentPath 부모 경로
   * @param childPath 자식 후보 경로
   * @return 직계 자식이면 true
   */
  private boolean isDirectChild(String parentPath, String childPath) {
    // 자식 경로가 부모 경로로 시작하지 않으면 관계가 없습니다.
    if (!childPath.startsWith(parentPath) || childPath.equals(parentPath)) {
      return false;
    }
    // 부모 경로 뒤의 나머지 부분을 추출합니다.
    String suffix = childPath.substring(parentPath.length());
    // 접두사로 /를 제거하고 남은 문자열에 /가 없다면 직계 자식입니다.
    if (suffix.startsWith("/")) {
      suffix = suffix.substring(1);
    }
    return !suffix.contains("/") && !suffix.isEmpty();
  }

  /**
   * 배열형 overlay에서 특정 path와 일치하는 node를 찾습니다.
   *
   * @param path 조회할 절대 경로
   * @return matching overlay node, 없으면 null
   */
  private JsonNode findOverlayArrayNode(String path) {
    // createdNodes에서 먼저 찾습니다.
    JsonNode createdNode = findOverlayArrayNode(path, "createdNodes");

    // createdNodes에 있으면 그대로 반환합니다.
    if (createdNode != null) {
      // 생성된 동적 노드입니다.
      return createdNode;
    }

    // modifiedNodes에서 찾습니다.
    return findOverlayArrayNode(path, "modifiedNodes");
  }

  /**
   * 지정한 overlay 배열에서 path가 일치하는 node를 찾습니다.
   *
   * @param path 조회할 절대 경로
   * @param fieldName overlay 배열 field 이름
   * @return matching overlay node, 없으면 null
   */
  private JsonNode findOverlayArrayNode(String path, String fieldName) {
    // overlay가 없으면 배열도 없습니다.
    if (vfsOverlay == null || vfsOverlay.isNull()) {
      // 검색 대상이 없습니다.
      return null;
    }

    // 지정 배열을 읽습니다.
    JsonNode array = vfsOverlay.path(fieldName);

    // 배열이 아니면 검색할 수 없습니다.
    if (!array.isArray()) {
      // matching node가 없습니다.
      return null;
    }

    // 배열 항목을 순회합니다.
    for (JsonNode item : array) {
      // path field가 일치하면 해당 node를 반환합니다.
      if (path.equals(item.path("path").asText())) {
        // matching node입니다.
        return item;
      }
    }

    // matching node가 없습니다.
    return null;
  }

  /**
   * removedPaths에 path가 포함되어 있는지 확인합니다.
   *
   * @param path 조회할 절대 경로
   * @return removedPaths에 있으면 true
   */
  private boolean isRemovedPath(String path) {
    // overlay가 없으면 삭제 목록도 없습니다.
    if (vfsOverlay == null || vfsOverlay.isNull()) {
      // 삭제되지 않은 것으로 봅니다.
      return false;
    }

    // removedPaths 배열을 읽습니다.
    JsonNode removedPaths = vfsOverlay.path("removedPaths");

    // 배열이 아니면 삭제 목록이 없습니다.
    if (!removedPaths.isArray()) {
      // 삭제되지 않은 것으로 봅니다.
      return false;
    }

    // removedPaths 항목을 순회합니다.
    for (JsonNode removedPath : removedPaths) {
      // 문자열 path가 일치하면 삭제된 경로입니다.
      if (removedPath.isTextual() && path.equals(removedPath.asText())) {
        // 삭제 목록에 포함되어 있습니다.
        return true;
      }
    }

    // 삭제 목록에 없습니다.
    return false;
  }

  /**
   * overlay 배열의 직계 자식 node를 childrenMap에 병합합니다.
   *
   * @param childrenMap 현재까지 수집한 자식 node map
   * @param parentPath 부모 경로
   * @param fieldName overlay 배열 field 이름
   */
  private void mergeOverlayArrayChildren(
      Map<String, VfsNode> childrenMap, String parentPath, String fieldName) {
    // overlay가 없으면 병합할 배열도 없습니다.
    if (vfsOverlay == null || vfsOverlay.isNull()) {
      // 아무 작업도 하지 않습니다.
      return;
    }

    // 지정 overlay 배열을 읽습니다.
    JsonNode array = vfsOverlay.path(fieldName);

    // 배열이 아니면 병합할 항목이 없습니다.
    if (!array.isArray()) {
      // 아무 작업도 하지 않습니다.
      return;
    }

    // 배열 항목을 순회합니다.
    for (JsonNode item : array) {
      // overlay node의 path를 읽습니다.
      String nodePath = item.path("path").asText(null);

      // path가 직계 자식이면 childrenMap에 덮어씁니다.
      if (nodePath != null && isDirectChild(parentPath, nodePath)) {
        // 동적 overlay node가 정적 node보다 우선합니다.
        childrenMap.put(nodePath, parseNode(nodePath, item));
      }
    }
  }

  /**
   * keyed overlay 구조의 직계 자식 node를 childrenMap에 병합합니다.
   *
   * @param childrenMap 현재까지 수집한 자식 node map
   * @param parentPath 부모 경로
   */
  private void mergeKeyedOverlayChildren(Map<String, VfsNode> childrenMap, String parentPath) {
    // overlay가 object가 아니면 keyed overlay를 순회할 수 없습니다.
    if (vfsOverlay == null || !vfsOverlay.isObject()) {
      // 아무 작업도 하지 않습니다.
      return;
    }

    // keyed overlay field들을 순회합니다.
    vfsOverlay
        .fields()
        .forEachRemaining(
            entry -> {
              // 배열형 overlay field는 keyed path가 아니므로 건너뜁니다.
              if ("createdNodes".equals(entry.getKey())
                  || "removedPaths".equals(entry.getKey())
                  || "modifiedNodes".equals(entry.getKey())) {
                return;
              }

              // field key를 node path로 사용합니다.
              String nodePath = entry.getKey();

              // 직계 자식이 아니면 병합하지 않습니다.
              if (!isDirectChild(parentPath, nodePath)) {
                return;
              }

              // 삭제 플래그가 있으면 결과 map에서 제거합니다.
              if (entry.getValue().path("deleted").asBoolean(false)) {
                childrenMap.remove(nodePath);
                return;
              }

              // keyed overlay node를 결과 map에 덮어씁니다.
              childrenMap.put(nodePath, parseNode(nodePath, entry.getValue()));
            });
  }

  /**
   * removedPaths에 포함된 직계 자식 node를 childrenMap에서 제거합니다.
   *
   * @param childrenMap 현재까지 수집한 자식 node map
   * @param parentPath 부모 경로
   */
  private void removeOverlayChildren(Map<String, VfsNode> childrenMap, String parentPath) {
    // overlay가 없으면 삭제 목록도 없습니다.
    if (vfsOverlay == null || vfsOverlay.isNull()) {
      // 아무 작업도 하지 않습니다.
      return;
    }

    // removedPaths 배열을 읽습니다.
    JsonNode removedPaths = vfsOverlay.path("removedPaths");

    // 배열이 아니면 삭제할 항목이 없습니다.
    if (!removedPaths.isArray()) {
      // 아무 작업도 하지 않습니다.
      return;
    }

    // removedPaths 항목을 순회합니다.
    for (JsonNode removedPath : removedPaths) {
      // 문자열 path만 처리합니다.
      if (!removedPath.isTextual()) {
        // 잘못된 항목은 건너뜁니다.
        continue;
      }

      // 삭제 path를 읽습니다.
      String nodePath = removedPath.asText();

      // 직계 자식이면 결과 map에서 제거합니다.
      if (isDirectChild(parentPath, nodePath)) {
        // 삭제된 path는 목록에서 빠집니다.
        childrenMap.remove(nodePath);
      }
    }
  }

  /**
   * JsonNode 데이터를 자바의 VfsNode 객체로 변환합니다.
   *
   * @param path 경로
   * @param data JSON 데이터
   * @return 파싱된 VfsNode 객체
   */
  private VfsNode parseNode(String path, JsonNode data) {
    return new VfsNode(
        path, // 전체 절대 경로
        data.path("name").asText(path.substring(path.lastIndexOf("/") + 1)), // 파일/디렉토리 이름
        data.path("type").asText("file"), // 타입 (file/directory)
        data.path("readable").asBoolean(true), // 읽기 권한
        data.path("executable").asBoolean(false), // 실행 권한
        data.path("protected").asBoolean(false), // 보호 여부
        data.path("hidden").asBoolean(false), // 숨김 여부
        data.path("storyKey").asText(null), // 스토리 전이용 키
        data.path("contentKey").asText(null), // 실제 내용 조회용 키
        null // 추가 메타데이터
        );
  }
}
