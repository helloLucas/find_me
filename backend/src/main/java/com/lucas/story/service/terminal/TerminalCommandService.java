package com.lucas.story.service.terminal;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Chapter 2 가상 터미널의 핵심 명령어를 처리하는 서비스 클래스입니다. pwd, ls, cd, cat, sh, clear 등의 표준 쉘 명령어를 가상 파일
 * 시스템(VFS) 상에서 시뮬레이션합니다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TerminalCommandService {

  /** 파일의 실제 내용을 제공하는 서비스 */
  private final FileContentService fileContentService;

  /** 가상 경로를 정규화하고 유효성을 검증하는 리졸버 */
  private final PathResolver pathResolver = new PathResolver();

  /** 시스템 보안을 위해 차단된 위험 명령어 목록 */
  private static final List<String> DANGEROUS_COMMANDS =
      Arrays.asList("rm", "mv", "cp", "chmod", "chown", "sudo", "su", "apt", "yum", "wget", "curl");

  /**
   * 입력된 명령어를 분석하여 적절한 핸들러를 호출하고 실행 결과를 반환합니다.
   *
   * @param command 파싱된 명령어 객체 (명령어 및 인자 포함)
   * @param snapshot 현재 세션의 터미널 상태 스냅샷 (CWD 등 포함)
   * @param vfs 현재 유효한 가상 파일 시스템 컨텍스트
   * @return 명령어 실행 결과 (stdout, stderr, 변경된 CWD 등)
   */
  public TerminalResult execute(ParsedCommand command, JsonNode snapshot, VfsContext vfs) {
    // 명령어 이름을 소문자로 정규화합니다.
    String cmd = command.command().toLowerCase();
    // 스냅샷에서 현재 작업 디렉토리(CWD)를 가져오며, 없을 경우 VFS 루트를 기본값으로 합니다.
    String cwd = snapshot.path("cwd").asText(vfs.getRootPath());

    // 위험 명령어가 입력되었는지 먼저 검증합니다.
    if (DANGEROUS_COMMANDS.contains(cmd)) {
      // 보안 정책에 의해 거부되었음을 에러로 반환합니다.
      return buildErrorResult(cwd, vfs, "[DENIED] This action is restricted by security policy.");
    }

    // 명령어 종류에 따라 각 핸들러로 분기 처리합니다.
    return switch (cmd) {
      case "find" -> handleFind(command, cwd, vfs);
      case "pwd" -> handlePwd(cwd, vfs); // 현재 경로 출력
      case "ls" -> handleLs(command, cwd, vfs); // 디렉토리 목록 조회
      case "cd" -> handleCd(command, cwd, vfs); // 경로 이동
      case "cat" -> handleCat(command, cwd, vfs); // 파일 내용 조회
      case "sh" -> handleSh(command, cwd, vfs); // 스크립트 실행 (특수 처리 포함)
      case "clear" -> handleClear(cwd, vfs); // 터미널 초기화 시그널 전송
      default -> buildErrorResult(cwd, vfs, cmd + ": command not found"); // 알 수 없는 명령어 처리
    };
  }

  /**
   * pwd 명령어를 처리하여 현재 작업 디렉토리 경로를 반환합니다.
   *
   * @param cwd 현재 경로
   * @param vfs VFS 컨텍스트
   * @return 현재 경로가 담긴 결과
   */
  private TerminalResult handlePwd(String cwd, VfsContext vfs) {
    return TerminalResult.builder()
        .stdout(Collections.singletonList(cwd)) // 현재 경로를 리스트로 담아 반환
        .cwd(cwd) // 경로는 변하지 않음
        .prompt(buildPrompt(cwd, vfs)) // 프롬프트 생성
        .resultCode("SUCCESS") // 성공 코드 설정
        .build();
  }

  /**
   * ls 명령어를 처리하여 디렉토리 내 파일 및 폴더 목록을 조회합니다.
   *
   * @param command 명령어 인자 (대상 경로 포함 가능)
   * @param cwd 현재 경로
   * @param vfs VFS 컨텍스트
   * @return 파일 목록 문자열을 포함한 결과
   */
  private TerminalResult handleLs(ParsedCommand command, String cwd, VfsContext vfs) {
    if (requiresExtendedLs(command)) {
      return handleExtendedLs(command, cwd, vfs);
    }

    // 인자가 없으면 현재 디렉토리, 있으면 해당 경로를 대상으로 결정합니다.
    String targetPath =
        command.args().isEmpty()
            ? cwd
            : pathResolver.resolve(cwd, command.args().get(0), vfs.getRootPath());
    // 대상 경로의 VFS 노드를 찾습니다.
    VfsNode node = vfs.resolve(targetPath);

    // 노드가 존재하지 않으면 에러를 반환합니다.
    if (node == null) {
      return buildErrorResult(
          cwd, vfs, "ls: " + command.args().get(0) + ": No such file or directory");
    }

    // 대상이 파일이면 파일 이름만 출력합니다.
    if (node.isFile()) {
      return TerminalResult.builder()
          .stdout(Collections.singletonList(node.name()))
          .cwd(cwd)
          .prompt(buildPrompt(cwd, vfs))
          .resultCode("SUCCESS")
          .build();
    }

    // 대상이 디렉토리면 하위 노드 목록을 가져옵니다.
    if (!node.readable() || node.isProtected()) {
      String rawTarget = command.args().isEmpty() ? "." : command.args().get(0);
      return buildErrorResult(cwd, vfs, "ls: " + rawTarget + ": Permission denied");
    }

    List<VfsNode> children = vfs.listChildren(targetPath);
    // 숨김 속성이 아닌 노드들의 이름만 추출하여 공백으로 연결합니다.
    List<String> output =
        children.stream()
            .filter(n -> !n.hidden())
            .map(n -> n.isDirectory() ? n.name() + "/" : n.name())
            .collect(Collectors.toList());

    return TerminalResult.builder()
        // 각 파일명을 별개의 라인으로 반환하여 세로로 출력되게 합니다.
        .stdout(output)
        .cwd(cwd)
        .prompt(buildPrompt(cwd, vfs))
        .resultCode("SUCCESS")
        .build();
  }

  /**
   * cd 명령어를 처리하여 작업 디렉토리를 변경합니다.
   *
   * @param command 명령어 인자 (이동할 경로)
   * @param cwd 현재 경로
   * @param vfs VFS 컨텍스트
   * @return 변경된 경로가 적용된 결과
   */
  private boolean requiresExtendedLs(ParsedCommand command) {
    return command.args().size() > 1
        || command.args().stream().anyMatch(arg -> arg.startsWith("-"));
  }

  private TerminalResult handleExtendedLs(ParsedCommand command, String cwd, VfsContext vfs) {
    boolean recursive = false;
    List<String> rawTargets = new ArrayList<>();

    for (String arg : command.args()) {
      if (arg.startsWith("-")) {
        if (!isSupportedLsOption(arg)) {
          return buildErrorResult(cwd, vfs, "ls: invalid option -- '" + arg + "'");
        }
        recursive = recursive || arg.substring(1).contains("R");
        continue;
      }

      rawTargets.add(arg);
    }

    if (rawTargets.isEmpty()) {
      rawTargets.add(".");
    }

    List<String> output = new ArrayList<>();
    boolean multipleTargets = rawTargets.size() > 1;
    for (String rawTarget : rawTargets) {
      String targetPath = pathResolver.resolve(cwd, rawTarget, vfs.getRootPath());
      VfsNode node = vfs.resolve(targetPath);
      if (node == null) {
        return buildErrorResult(cwd, vfs, "ls: " + rawTarget + ": No such file or directory");
      }

      if (!node.readable() || node.isProtected()) {
        return buildErrorResult(cwd, vfs, "ls: " + rawTarget + ": Permission denied");
      }

      if (node.isFile()) {
        output.add(node.name());
        continue;
      }

      if (recursive) {
        appendRecursiveLsOutput(output, rawTarget, targetPath, vfs);
      } else {
        if (multipleTargets) {
          if (!output.isEmpty()) {
            output.add("");
          }
          output.add(rawTarget + ":");
        }
        output.addAll(listDirectoryNames(targetPath, vfs));
      }
    }

    return TerminalResult.builder()
        .stdout(output)
        .cwd(cwd)
        .prompt(buildPrompt(cwd, vfs))
        .resultCode("SUCCESS")
        .build();
  }

  private void appendRecursiveLsOutput(
      List<String> output, String displayPath, String targetPath, VfsContext vfs) {
    if (!output.isEmpty()) {
      output.add("");
    }
    output.add(displayPath + ":");
    output.addAll(listDirectoryNames(targetPath, vfs));

    for (VfsNode child :
        vfs.listChildren(targetPath).stream()
            .filter(n -> !n.hidden())
            .filter(VfsNode::isDirectory)
            .collect(Collectors.toList())) {
      if (!child.readable() || child.isProtected()) {
        continue;
      }
      String childDisplayPath =
          ".".equals(displayPath)
              ? "./" + child.name()
              : displayPath.replaceAll("/$", "") + "/" + child.name();
      appendRecursiveLsOutput(output, childDisplayPath, child.path(), vfs);
    }
  }

  private List<String> listDirectoryNames(String targetPath, VfsContext vfs) {
    return vfs.listChildren(targetPath).stream()
        .filter(n -> !n.hidden())
        .map(n -> n.isDirectory() ? n.name() + "/" : n.name())
        .collect(Collectors.toList());
  }

  private boolean isSupportedLsOption(String arg) {
    if (arg == null || arg.length() < 2 || !arg.startsWith("-")) {
      return false;
    }

    for (int i = 1; i < arg.length(); i++) {
      char option = arg.charAt(i);
      if (option != 'a' && option != 'l' && option != 'R') {
        return false;
      }
    }
    return true;
  }

  private TerminalResult handleFind(ParsedCommand command, String cwd, VfsContext vfs) {
    FindQuery query = parseFindQuery(command.args());
    if (query == null) {
      return buildErrorResult(cwd, vfs, "find: invalid expression");
    }

    Pattern namePattern = Pattern.compile(toNameGlobRegex(query.namePattern()));
    Set<String> matches = new LinkedHashSet<>();

    for (String rawRoot : query.roots()) {
      String targetPath = pathResolver.resolve(cwd, rawRoot, vfs.getRootPath());
      VfsNode node = vfs.resolve(targetPath);
      if (node == null) {
        return buildErrorResult(cwd, vfs, "find: '" + rawRoot + "': No such file or directory");
      }
      if (!node.readable() || node.isProtected()) {
        return buildErrorResult(cwd, vfs, "find: '" + rawRoot + "': Permission denied");
      }
      collectFindMatches(vfs, node, query.typeFileOnly(), namePattern, matches);
    }

    List<String> output =
        matches.stream().map(path -> toDisplayFindPath(path, cwd)).collect(Collectors.toList());
    return TerminalResult.builder()
        .stdout(output)
        .cwd(cwd)
        .prompt(buildPrompt(cwd, vfs))
        .resultCode("SUCCESS")
        .build();
  }

  private FindQuery parseFindQuery(List<String> args) {
    List<String> roots = new ArrayList<>();
    boolean typeFileOnly = false;
    boolean predicateStarted = false;
    String namePattern = null;

    for (int i = 0; i < args.size(); i++) {
      String arg = args.get(i);
      if ("-type".equals(arg)) {
        if (i + 1 >= args.size() || !"f".equals(args.get(i + 1))) {
          return null;
        }
        typeFileOnly = true;
        predicateStarted = true;
        i++;
        continue;
      }

      if ("-name".equals(arg)) {
        if (i + 1 >= args.size()) {
          return null;
        }
        namePattern = args.get(++i);
        predicateStarted = true;
        continue;
      }

      if (arg.startsWith("-") || predicateStarted) {
        return null;
      }

      roots.add(arg);
    }

    if (roots.isEmpty()) {
      roots.add(".");
    }
    if (namePattern == null || namePattern.isBlank()) {
      return null;
    }
    return new FindQuery(roots, typeFileOnly, namePattern);
  }

  private void collectFindMatches(
      VfsContext vfs,
      VfsNode node,
      boolean typeFileOnly,
      Pattern namePattern,
      Set<String> matches) {
    if (node.hidden()) {
      return;
    }

    if ((!typeFileOnly || node.isFile()) && namePattern.matcher(node.name()).matches()) {
      matches.add(node.path());
    }

    if (!node.isDirectory() || !node.readable() || node.isProtected()) {
      return;
    }

    for (VfsNode child : vfs.listChildren(node.path())) {
      collectFindMatches(vfs, child, typeFileOnly, namePattern, matches);
    }
  }

  private String toNameGlobRegex(String pattern) {
    StringBuilder regex = new StringBuilder("^");
    for (int i = 0; i < pattern.length(); i++) {
      char ch = pattern.charAt(i);
      if (ch == '*') {
        regex.append(".*");
      } else if (ch == '?') {
        regex.append('.');
      } else {
        if ("\\.[]{}()+-^$|".indexOf(ch) >= 0) {
          regex.append('\\');
        }
        regex.append(ch);
      }
    }
    regex.append('$');
    return regex.toString();
  }

  private String toDisplayFindPath(String path, String cwd) {
    if (path.equals(cwd)) {
      return ".";
    }

    String cwdPrefix = cwd.endsWith("/") ? cwd : cwd + "/";
    if (path.startsWith(cwdPrefix)) {
      return "./" + path.substring(cwdPrefix.length());
    }
    return path;
  }

  private record FindQuery(List<String> roots, boolean typeFileOnly, String namePattern) {}

  private TerminalResult handleCd(ParsedCommand command, String cwd, VfsContext vfs) {
    // 인자가 없으면 루트 디렉토리로 이동합니다.
    if (command.args().isEmpty()) {
      return TerminalResult.builder()
          .cwd(vfs.getRootPath())
          .prompt(buildPrompt(vfs.getRootPath(), vfs))
          .resultCode("SUCCESS")
          .build();
    }

    // 이동할 대상 경로를 계산합니다.
    String targetPath = pathResolver.resolve(cwd, command.args().get(0), vfs.getRootPath());
    // 대상 경로의 노드를 찾습니다.
    VfsNode node = vfs.resolve(targetPath);

    // 대상이 없으면 에러를 반환합니다.
    if (node == null) {
      return buildErrorResult(
          cwd, vfs, "cd: " + command.args().get(0) + ": No such file or directory");
    }

    // 대상이 파일이면 디렉토리가 아니라는 에러를 반환합니다.
    if (node.isFile()) {
      return buildErrorResult(cwd, vfs, "cd: " + command.args().get(0) + ": Not a directory");
    }

    // 대상이 읽기 권한이 없거나 보호된 영역이면 접근 거부를 반환합니다.
    if (node.isProtected()) {
      return buildErrorResult(cwd, vfs, "cd: " + command.args().get(0) + ": Permission denied");
    }

    // 유효한 경로면 타겟 경로로 CWD를 업데이트하여 반환합니다.
    return TerminalResult.builder()
        .cwd(targetPath)
        .prompt(buildPrompt(targetPath, vfs))
        .resultCode("SUCCESS")
        .build();
  }

  /**
   * cat 명령어를 처리하여 파일의 내용을 출력합니다.
   *
   * @param command 명령어 인자 (대상 파일)
   * @param cwd 현재 경로
   * @param vfs VFS 컨텍스트
   * @return 파일의 텍스트 내용이 담긴 결과
   */
  private TerminalResult handleCat(ParsedCommand command, String cwd, VfsContext vfs) {
    // 인자가 없으면 아무것도 출력하지 않고 성공을 반환합니다.
    if (command.args().isEmpty()) {
      return TerminalResult.builder()
          .cwd(cwd)
          .prompt(buildPrompt(cwd, vfs))
          .resultCode("SUCCESS")
          .build();
    }

    // 파일의 경로를 해석합니다.
    String targetPath = pathResolver.resolve(cwd, command.args().get(0), vfs.getRootPath());
    // 노드를 확인합니다.
    VfsNode node = vfs.resolve(targetPath);

    // 파일이 없으면 에러를 반환합니다.
    if (node == null) {
      return buildErrorResult(
          cwd, vfs, "cat: " + command.args().get(0) + ": No such file or directory");
    }

    // 대상이 디렉토리면 cat할 수 없다는 에러를 반환합니다.
    if (node.isDirectory()) {
      return buildErrorResult(cwd, vfs, "cat: " + command.args().get(0) + ": Is a directory");
    }

    // 읽기 권한이 없으면 접근 거부 에러를 반환합니다.
    if (!node.readable()) {
      return buildErrorResult(cwd, vfs, "cat: " + command.args().get(0) + ": Permission denied");
    }

    // FileContentService를 통해 contents.json에서 실제 텍스트 내용을 가져옵니다.
    List<String> content = fileContentService.getContent(node.contentKey());
    return TerminalResult.builder()
        .stdout(content) // 가져온 내용을 표준 출력에 설정
        .cwd(cwd)
        .prompt(buildPrompt(cwd, vfs))
        .resultCode("SUCCESS")
        .build();
  }

  /**
   * sh 명령어를 처리하여 스크립트 실행을 시뮬레이션합니다. lucas_fragment_01.sh 같은 특수 파일에 대한 고정 실패 메시지를 포함합니다.
   *
   * @param command 명령어 인자 (대상 스크립트 파일)
   * @param cwd 현재 경로
   * @param vfs VFS 컨텍스트
   * @return 실행 시도 결과 (실패 또는 권한 거부)
   */
  private TerminalResult handleSh(ParsedCommand command, String cwd, VfsContext vfs) {
    // 대상 파일이 지정되지 않았으면 에러를 반환합니다.
    if (command.args().isEmpty()) {
      return buildErrorResult(cwd, vfs, "sh: missing operand");
    }

    // 경로를 해석합니다.
    String targetPath = pathResolver.resolve(cwd, command.args().get(0), vfs.getRootPath());
    VfsNode node = vfs.resolve(targetPath);

    // 파일이 없으면 에러를 반환합니다.
    if (node == null) {
      return buildErrorResult(
          cwd, vfs, "sh: " + command.args().get(0) + ": No such file or directory");
    }

    if ("maple_story.sh".equals(node.name())) {
      return TerminalResult.builder()
          .stdout(
              Arrays.asList(
                  "[MAPLE_STORY] timing module mounted.",
                  "[MAPLE_STORY] launching client...",
                  "terminal://maple-story"))
          .cwd(cwd)
          .prompt(buildPrompt(cwd, vfs))
          .resultCode("SUCCESS")
          .build();
    }

    // lucas_fragment_01.sh 전용 에러 메시지 (스토리 요구사항 반영)
    if ("LUCAS_FRAGMENT_01".equals(node.contentKey())) {
      return TerminalResult.builder()
          .stderr(
              Arrays.asList(
                  "[FAILED] 이 파편은 독립적으로 실행되지 않습니다.",
                  "[TRACE] 외부 관측자 입력이 필요한 상태입니다.")) // 요구사항에 명시된 에러 메시지를 stderr에 담아 반환
          .cwd(cwd)
          .prompt(buildPrompt(cwd, vfs))
          .resultCode("ERROR")
          .build();
    }

    // 그 외 파일은 실행 권한 거부 에러를 반환합니다.
    return buildErrorResult(cwd, vfs, "sh: " + node.name() + ": Permission denied");
  }

  /**
   * clear 명령어를 처리하여 터미널 화면 초기화 시그널을 전송합니다. 프론트엔드는 "__CLEAR_TERMINAL__" 문자열을 받으면 화면을 비웁니다.
   *
   * @param cwd 현재 경로
   * @param vfs VFS 컨텍스트
   * @return 화면 초기화 시그널이 담긴 결과
   */
  private TerminalResult handleClear(String cwd, VfsContext vfs) {
    return TerminalResult.builder()
        .stdout(Collections.singletonList("__CLEAR_TERMINAL__")) // 특수 시그널 반환
        .cwd(cwd)
        .prompt(buildPrompt(cwd, vfs))
        .resultCode("SUCCESS")
        .build();
  }

  /**
   * 에러 메시지를 포함한 터미널 실행 결과를 생성하는 공통 헬퍼 메소드입니다.
   *
   * @param cwd 현재 경로
   * @param vfs VFS 컨텍스트
   * @param errorMsg 출력할 에러 메시지
   * @return 에러 내용이 담긴 TerminalResult 객체
   */
  private TerminalResult buildErrorResult(String cwd, VfsContext vfs, String errorMsg) {
    return TerminalResult.builder()
        .stderr(Collections.singletonList(errorMsg)) // 에러 스트림에 메시지 설정
        .cwd(cwd)
        .prompt(buildPrompt(cwd, vfs))
        .resultCode("ERROR") // 실패 코드 설정
        .build();
  }

  /**
   * 현재 경로를 기반으로 사용자에게 보여줄 쉘 프롬프트 문자열을 생성합니다. 루트 경로는 ~로 치환하여 보여줍니다.
   *
   * @param cwd 현재 경로
   * @param vfs VFS 컨텍스트
   * @return 프롬프트 문자열 (예: guest@lucas-server:~$)
   */
  private String buildPrompt(String cwd, VfsContext vfs) {
    // 현재 경로가 루트면 ~, 아니면 루트 경로 문자열을 ~로 바꾼 상대적 느낌의 경로를 생성합니다.
    String displayCwd = cwd.equals(vfs.getRootPath()) ? "~" : cwd.replace(vfs.getRootPath(), "~");
    // 설정된 유저명과 호스트명을 조합하여 표준적인 Bash 형태의 프롬프트를 완성합니다.
    return "guest@lucas-server:" + displayCwd + "$";
  }
}
