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
    return staticVfs.path("rootPath").asText("/home/guest");
  }

  /**
   * 특정 절대 경로에 해당하는 파일 또는 디렉토리 노드를 찾습니다. 동적 오버레이에 변경사항이 있으면 이를 우선적으로 반영합니다.
   *
   * @param path 조회할 절대 경로
   * @return 해당하는 VfsNode 객체 (없을 경우 null)
   */
  public VfsNode resolve(String path) {
    // 1. 먼저 동적 오버레이(Snapshot 내 vfsOverlay)에서 노드를 조회합니다.
    JsonNode overlayNode = vfsOverlay.path(path);
    if (!overlayNode.isMissingNode()) {
      // 오버레이에 삭제 플래그(deleted: true)가 있으면 없는 것으로 간주합니다.
      if (overlayNode.path("deleted").asBoolean(false)) {
        return null;
      }
      // 오버레이 노드 정보를 파싱하여 반환합니다.
      return parseNode(path, overlayNode);
    }

    // 2. 오버레이에 없으면 정적 VFS 정의 파일(vfs.json)에서 조회합니다.
    JsonNode staticNode = staticVfs.path("nodes").path(path);
    if (!staticNode.isMissingNode()) {
      // 정적 노드 정보를 파싱하여 반환합니다.
      return parseNode(path, staticNode);
    }

    // 3. 어디에도 존재하지 않는 경로면 null을 반환합니다.
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
    JsonNode nodes = staticVfs.path("nodes");
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

    // 2. 동적 오버레이에서 추가된 요소나 변경된 요소를 반영합니다.
    vfsOverlay
        .fields()
        .forEachRemaining(
            entry -> {
              String nodePath = entry.getKey();
              if (isDirectChild(path, nodePath)) {
                JsonNode val = entry.getValue();
                // 삭제된 노드면 결과 맵에서 제거합니다.
                if (val.path("deleted").asBoolean(false)) {
                  childrenMap.remove(nodePath);
                } else {
                  // 추가되거나 수정된 노드면 맵에 덮어씁니다.
                  childrenMap.put(nodePath, parseNode(nodePath, val));
                }
              }
            });

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
