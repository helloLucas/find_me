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
}
