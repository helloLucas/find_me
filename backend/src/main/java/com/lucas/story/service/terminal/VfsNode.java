package com.lucas.story.service.terminal;

import java.util.Map;

/** 가상 파일 시스템의 개별 파일 또는 디렉토리 정보를 담는 데이터 불변 객체(Record)입니다. DB 엔티티가 아닌 메모리 상의 논리적 노드 정보를 표현합니다. */
public record VfsNode(
    /** 파일 시스템 내의 전체 절대 경로 */
    String path,
    /** 파일 또는 디렉토리의 실제 이름 */
    String name,
    /** 노드의 타입 (예: "file", "directory") */
    String type,
    /** 해당 노드의 읽기 가능 여부 */
    boolean readable,
    /** 해당 노드의 실행 가능 여부 (sh 명령어 등에서 사용) */
    boolean executable,
    /** 해당 노드가 시스템 보호 구역인지 여부 (cd 접근 제한 등에 사용) */
    boolean isProtected,
    /** 터미널 ls 시 숨김 처리 여부 */
    boolean hidden,
    /** 이 노드가 특정 스토리 전이와 연결될 때 사용하는 키 */
    String storyKey,
    /** FileContentService에서 내용을 가져오기 위해 사용하는 키 (contents.json 매핑) */
    String contentKey,
    /** 기타 파일 속성이나 스토리 관련 부가 정보 */
    Map<String, Object> metadata) {
  /**
   * 해당 노드가 디렉토리 타입인지 확인합니다.
   *
   * @return 디렉토리면 true
   */
  public boolean isDirectory() {
    // type 필드가 "directory"와 일치하는지 확인합니다.
    return "directory".equals(type);
  }

  /**
   * 해당 노드가 일반 파일 타입인지 확인합니다.
   *
   * @return 파일이면 true
   */
  public boolean isFile() {
    // type 필드가 "file"과 일치하는지 확인합니다.
    return "file".equals(type);
  }
}
