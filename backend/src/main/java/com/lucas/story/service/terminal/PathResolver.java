package com.lucas.story.service.terminal;

import java.util.Stack;

/** 가상 터미널의 상대 경로 및 절대 경로를 정규화된 절대 경로로 해석하는 리졸버 클래스입니다. 상위 디렉토리 이동(..) 및 루트 이탈 방지 보안 로직을 포함합니다. */
public class PathResolver {

  /**
   * 현재 경로와 유저 입력을 결합하여 최종 절대 경로를 도출합니다.
   *
   * @param cwd 현재 작업 디렉토리
   * @param input 유저가 입력한 경로 (상대/절대 모두 지원)
   * @param rootPath VFS의 최상위 루트 경로 (보안 경계)
   * @return 정규화된 최종 절대 경로
   */
  public String resolve(String cwd, String input, String rootPath) {
    // 입력이 없거나 비어있으면 현재 경로를 그대로 반환합니다.
    if (input == null || input.trim().isEmpty()) {
      return cwd;
    }

    String target;
    // 입력이 /로 시작하면 절대 경로로 간주합니다.
    if (input.startsWith("/")) {
      target = input;
    } else if (input.equals("~")) {
      // ~ 입력 시 가상 홈(루트) 디렉토리로 해석합니다.
      target = rootPath;
    } else if (input.startsWith("~/")) {
      // ~/ 시작 시 루트 하위 경로로 해석합니다.
      target = rootPath + input.substring(1);
    } else {
      // 그 외에는 현재 경로 뒤에 입력을 붙여 상대 경로로 처리합니다.
      target = cwd + (cwd.endsWith("/") ? "" : "/") + input;
    }

    // 도출된 경로를 정규화하여 반환합니다.
    return normalize(target, rootPath);
  }

  /**
   * VFS 정책을 기준으로 현재 경로와 입력 경로를 정규화합니다. 챕터별 VFS가 루트 밖 허용 경로를 정의한 경우 이를 반영합니다.
   *
   * @param cwd 현재 작업 디렉토리
   * @param input 유저가 입력한 경로
   * @param vfs 현재 VFS 컨텍스트
   * @return 정규화된 최종 절대 경로
   */
  public String resolve(String cwd, String input, VfsContext vfs) {
    // VFS가 없으면 기존 Chapter 2 기본 루트 경로를 fallback으로 사용한다.
    String rootPath = vfs == null ? "/home/guest" : vfs.getRootPath();

    // 입력이 비어 있으면 현재 경로를 유지하되, 현재 경로도 없으면 루트로 보정한다.
    if (input == null || input.trim().isEmpty()) {
      return cwd == null || cwd.isBlank() ? rootPath : cwd;
    }

    String target;
    String homePath = vfs != null && "root".equals(vfs.getPromptUser()) ? "/root" : rootPath;
    // /로 시작하는 입력은 절대 경로로 해석한다.
    if (input.startsWith("/")) {
      target = input;
    } else if (input.equals("~")) {
      // 단독 ~ 입력은 현재 프롬프트 사용자의 홈 디렉터리로 해석한다.
      target = homePath;
    } else if (input.startsWith("~/")) {
      // ~/로 시작하는 입력은 현재 프롬프트 사용자의 홈 하위 상대 경로로 해석한다.
      target = homePath + input.substring(1);
    } else {
      // cwd가 비어 있으면 루트 경로를 기준으로 상대 경로를 해석한다.
      String safeCwd = cwd == null || cwd.isBlank() ? rootPath : cwd;

      // 일반 입력은 현재 작업 디렉터리 뒤에 붙여 절대 경로 후보를 만든다.
      target = safeCwd + (safeCwd.endsWith("/") ? "" : "/") + input;
    }

    // 챕터별 VFS 정책을 반영해 최종 경로를 정규화한다.
    return normalize(target, vfs);
  }

  /**
   * 경로 내의 . 이나 .. 을 해석하여 불필요한 요소를 제거한 정규화된 경로를 생성합니다. 루트 경로 밖으로 나가는 접근을 차단합니다.
   *
   * @param path 정규화할 대상 경로
   * @param rootPath 허용되는 최소 루트 경로
   * @return 정규화된 절대 경로
   */
  private String normalize(String path, String rootPath) {
    // 경로 요소를 분리합니다.
    String[] parts = path.split("/");
    Stack<String> stack = new Stack<>();

    // 각 요소를 순차적으로 스택에 쌓으며 해석합니다.
    for (String part : parts) {
      // 빈 문자열이나 현재 디렉토리(.)는 무시합니다.
      if (part.isEmpty() || part.equals(".")) {
        continue;
      }
      // 상위 디렉토리(..) 처리
      if (part.equals("..")) {
        // 스택에 요소가 있으면 하나 제거하여 상위로 이동합니다.
        if (!stack.isEmpty()) {
          stack.pop();
        }
      } else {
        // 일반 디렉토리명은 스택에 추가합니다.
        stack.push(part);
      }
    }

    // 스택의 내용을 합쳐서 절대 경로 문자열로 재구성합니다.
    String normalized = "/" + String.join("/", stack);

    // 보안 체크: 정규화된 경로가 허용된 rootPath로 시작하지 않으면 rootPath를 강제 적용합니다.
    if (!normalized.startsWith(rootPath)) {
      return rootPath;
    }

    return normalized;
  }

  /**
   * 챕터별 VFS 정책을 기준으로 경로를 정규화합니다.
   *
   * <p>기본적으로 VFS 루트 밖 접근을 차단하지만, vfs.json의 policies가 루트 밖 허용 경로를 명시한 경우 해당 외부 경로는 유지합니다.
   *
   * @param path 정규화할 대상 경로
   * @param vfs 현재 VFS 컨텍스트
   * @return 정책을 반영한 정규화 절대 경로
   */
  private String normalize(String path, VfsContext vfs) {
    // VFS가 없으면 기존 기본 루트 경로를 기준으로 정규화한다.
    String rootPath = vfs == null ? "/home/guest" : vfs.getRootPath();

    // 경로 요소를 / 기준으로 분리한다.
    String[] parts = path.split("/");

    // . 과 .. 을 해석하기 위한 임시 스택을 준비한다.
    Stack<String> stack = new Stack<>();

    // 각 경로 요소를 순서대로 해석한다.
    for (String part : parts) {
      // 빈 요소와 현재 디렉터리 표시는 무시한다.
      if (part.isEmpty() || part.equals(".")) {
        continue;
      }

      // .. 은 가능한 경우 직전 경로 요소를 제거한다.
      if (part.equals("..")) {
        if (!stack.isEmpty()) {
          stack.pop();
        }
      } else {
        // 일반 경로 요소는 최종 경로 후보에 추가한다.
        stack.push(part);
      }
    }

    // 스택의 내용을 다시 절대 경로 문자열로 조립한다.
    String normalized = "/" + String.join("/", stack);

    // VFS 루트 내부 경로면 그대로 허용한다.
    if (normalized.startsWith(rootPath)) {
      return normalized;
    }

    // 정책상 루트 밖 접근이 허용되고, 허용 목록에 포함된 외부 경로면 그대로 허용한다.
    if (vfs != null && !vfs.denyOutsideRoot() && vfs.isAllowedExternalPath(normalized)) {
      return normalized;
    }

    // 그 외 루트 밖 경로는 보안상 VFS 루트로 보정한다.
    return rootPath;
  }
}
