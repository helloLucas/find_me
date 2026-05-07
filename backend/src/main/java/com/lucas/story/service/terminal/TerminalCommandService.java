package com.lucas.story.service.terminal;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 터미널/VFS 기반 챕터의 핵심 명령어를 처리하는 서비스 클래스입니다.
 *
 * <p>{@code pwd}, {@code ls}, {@code cd}, {@code cat}, {@code sh}, {@code clear} 등의 표준 쉘 명령어를 현재
 * 챕터의 가상 파일 시스템(VFS) 상에서 시뮬레이션합니다.
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
    // 스냅샷에서 현재 작업 디렉토리(CWD)를 가져오며, 없을 경우 챕터별 기본 cwd를 사용합니다.
    String cwd = snapshot.path("cwd").asText(vfs.getDefaultCwd());

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
        command.args().isEmpty() ? cwd : pathResolver.resolve(cwd, command.args().get(0), vfs);
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
   * 기본 ls 처리로는 표현하기 어려운 옵션형 ls인지 판단합니다.
   *
   * @param command 파싱된 터미널 명령어
   * @return 옵션 또는 여러 대상 경로가 있으면 true
   */
  private boolean requiresExtendedLs(ParsedCommand command) {
    // 대상 경로가 여러 개면 각 경로별 헤더 처리가 필요하므로 확장 ls로 넘깁니다.
    return command.args().size() > 1
        // 하나라도 옵션 형태이면 -a, -l, -R 조합을 해석해야 하므로 확장 ls로 넘깁니다.
        || command.args().stream().anyMatch(arg -> arg.startsWith("-"));
  }

  /**
   * -a, -l, -R 옵션과 여러 대상 경로를 지원하는 ls 명령을 처리합니다.
   *
   * @param command 파싱된 터미널 명령어
   * @param cwd 현재 작업 디렉토리
   * @param vfs 현재 VFS 컨텍스트
   * @return 옵션이 반영된 ls 실행 결과
   */
  private TerminalResult handleExtendedLs(ParsedCommand command, String cwd, VfsContext vfs) {
    // -a 옵션이 들어오면 숨김 파일과 . / .. pseudo entry를 함께 보여줍니다.
    boolean showHidden = false;
    // -l 옵션이 들어오면 total과 권한/소유자/크기 형식의 long listing을 만듭니다.
    boolean longFormat = false;
    // -R 옵션이 들어오면 하위 디렉토리까지 재귀적으로 목록을 출력합니다.
    boolean recursive = false;
    // 옵션을 제외하고 실제로 조회할 경로 인자만 별도로 모읍니다.
    List<String> rawTargets = new ArrayList<>();

    // 입력된 ls 인자를 왼쪽에서 오른쪽으로 해석합니다.
    for (String arg : command.args()) {
      // 하이픈으로 시작하는 값은 옵션 묶음으로 판단합니다.
      if (arg.startsWith("-")) {
        // 지원하지 않는 옵션이 섞여 있으면 실제 ls처럼 invalid option 에러를 반환합니다.
        if (!isSupportedLsOption(arg)) {
          return buildErrorResult(cwd, vfs, "ls: invalid option -- '" + arg + "'");
        }
        // 선행 하이픈을 제거해 a, l, R 조합만 검사합니다.
        String options = arg.substring(1);
        // 기존에 감지한 -a 상태를 유지하면서 현재 옵션 묶음의 a 포함 여부를 반영합니다.
        showHidden = showHidden || options.contains("a");
        // 기존에 감지한 -l 상태를 유지하면서 현재 옵션 묶음의 l 포함 여부를 반영합니다.
        longFormat = longFormat || options.contains("l");
        // 기존에 감지한 -R 상태를 유지하면서 현재 옵션 묶음의 R 포함 여부를 반영합니다.
        recursive = recursive || options.contains("R");
        // 옵션 인자는 대상 경로가 아니므로 다음 인자로 넘어갑니다.
        continue;
      }

      // 옵션이 아닌 값은 VFS에서 조회할 원본 대상 경로로 저장합니다.
      rawTargets.add(arg);
    }

    // 대상 경로가 없으면 실제 ls와 동일하게 현재 디렉토리를 대상으로 처리합니다.
    if (rawTargets.isEmpty()) {
      rawTargets.add(".");
    }

    // 터미널에 출력할 라인을 순서대로 누적합니다.
    List<String> output = new ArrayList<>();
    // 여러 경로를 조회할 때는 각 경로 앞에 헤더를 출력해야 합니다.
    boolean multipleTargets = rawTargets.size() > 1;
    // 사용자가 지정한 각 대상 경로를 독립적으로 처리합니다.
    for (String rawTarget : rawTargets) {
      // 상대 경로, 홈 별칭 등을 현재 cwd 기준 절대 경로로 정규화합니다.
      String targetPath = pathResolver.resolve(cwd, rawTarget, vfs);
      // 정규화된 경로가 VFS에 존재하는지 확인합니다.
      VfsNode node = vfs.resolve(targetPath);
      // 존재하지 않는 경로이면 실제 ls와 유사한 에러를 반환합니다.
      if (node == null) {
        return buildErrorResult(cwd, vfs, "ls: " + rawTarget + ": No such file or directory");
      }

      // 읽을 수 없거나 보호된 노드는 권한 오류로 처리합니다.
      if (!node.readable() || node.isProtected()) {
        return buildErrorResult(cwd, vfs, "ls: " + rawTarget + ": Permission denied");
      }

      // 대상이 파일이면 디렉토리 확장 처리 없이 파일 한 줄만 출력합니다.
      if (node.isFile()) {
        // -l이 있으면 파일도 long listing 형식으로 맞춥니다.
        output.add(longFormat ? formatLongListingLine(node) : node.name());
        // 파일 대상 처리가 끝났으므로 다음 대상 경로로 넘어갑니다.
        continue;
      }

      // -R 옵션은 현재 디렉토리와 하위 디렉토리 목록을 재귀적으로 출력합니다.
      if (recursive) {
        appendRecursiveLsOutput(output, rawTarget, targetPath, vfs, showHidden, longFormat);
      } else {
        // 여러 대상 경로를 출력할 때는 이전 출력과 현재 헤더 사이에 빈 줄을 넣습니다.
        if (multipleTargets) {
          if (!output.isEmpty()) {
            output.add("");
          }
          // 실제 ls처럼 대상 경로명을 헤더로 표시합니다.
          output.add(rawTarget + ":");
        }
        // 현재 디렉토리의 목록을 옵션에 맞는 출력 라인으로 변환해 누적합니다.
        output.addAll(listDirectoryOutput(targetPath, vfs, showHidden, longFormat));
      }
    }

    // 누적한 stdout과 기존 cwd, prompt를 묶어 성공 결과를 반환합니다.
    return TerminalResult.builder()
        .stdout(output)
        .cwd(cwd)
        .prompt(buildPrompt(cwd, vfs))
        .resultCode("SUCCESS")
        .build();
  }

  private void appendRecursiveLsOutput(
      List<String> output,
      String displayPath,
      String targetPath,
      VfsContext vfs,
      boolean showHidden,
      boolean longFormat) {
    // 이전 디렉토리 출력이 있으면 재귀 출력 블록 사이에 빈 줄을 둡니다.
    if (!output.isEmpty()) {
      output.add("");
    }
    // 현재 재귀 블록이 어떤 경로의 목록인지 헤더로 표시합니다.
    output.add(displayPath + ":");
    // 현재 디렉토리 자체의 목록을 먼저 출력합니다.
    output.addAll(listDirectoryOutput(targetPath, vfs, showHidden, longFormat));

    // 재귀 대상은 현재 디렉토리의 표시 대상 자식 중 실제 디렉토리만 선별합니다.
    for (VfsNode child :
        listDirectoryChildren(targetPath, vfs, showHidden).stream()
            // . / .. 는 순환 재귀를 만들 수 있으므로 하위 탐색 대상에서 제외합니다.
            .filter(n -> !isPseudoDirectory(n))
            // 파일은 재귀 탐색 대상이 아니므로 디렉토리만 남깁니다.
            .filter(VfsNode::isDirectory)
            .collect(Collectors.toList())) {
      // 읽을 수 없거나 보호된 하위 디렉토리는 목록 확장을 건너뜁니다.
      if (!child.readable() || child.isProtected()) {
        continue;
      }
      // 현재 표시 경로가 . 이면 ./child 형식으로 실제 ls -R 출력과 유사하게 만듭니다.
      String childDisplayPath =
          ".".equals(displayPath)
              ? "./" + child.name()
              : displayPath.replaceAll("/$", "") + "/" + child.name();
      // 하위 디렉토리에 같은 옵션을 전달해 재귀 출력합니다.
      appendRecursiveLsOutput(output, childDisplayPath, child.path(), vfs, showHidden, longFormat);
    }
  }

  /**
   * ls 옵션에 맞춰 디렉토리 출력 라인을 만든다.
   *
   * @param targetPath 목록을 출력할 디렉토리 절대 경로
   * @param vfs 현재 VFS 컨텍스트
   * @param showHidden {@code -a} 옵션 포함 여부
   * @param longFormat {@code -l} 옵션 포함 여부
   * @return 터미널에 표시할 출력 라인 목록
   */
  private List<String> listDirectoryOutput(
      String targetPath, VfsContext vfs, boolean showHidden, boolean longFormat) {
    // 실제 ls -a처럼 숨김 표시 시 . / .. 가 목록과 total 계산에 포함된다.
    List<VfsNode> entries = listDirectoryChildren(targetPath, vfs, showHidden);

    // 일반 ls 계열은 이름만 출력하고 long format은 별도 total 및 상세 라인을 출력한다.
    if (!longFormat) {
      // long format이 아니면 각 VFS 노드를 일반 표시 이름으로 변환한다.
      return entries.stream()
          // 디렉토리는 /를 붙이고 . / .. 는 그대로 둔다.
          .map(this::formatDisplayName)
          .collect(Collectors.toList());
    }

    // long format 출력은 total 라인과 상세 라인을 순서대로 담아야 하므로 가변 리스트를 사용한다.
    List<String> output = new ArrayList<>();
    // total은 실제로 화면에 표시되는 entry 목록을 기준으로 동적으로 계산한다.
    output.add("total " + calculateTotalBlocks(entries));
    // 각 entry를 ls -l 형식의 한 줄로 변환해 total 아래에 이어 붙인다.
    entries.stream().map(this::formatLongListingLine).forEach(output::add);
    // 완성된 long listing 출력 라인을 반환한다.
    return output;
  }

  /**
   * 디렉토리의 표시 대상 자식 노드를 정렬해 반환한다.
   *
   * @param targetPath 조회할 디렉토리 절대 경로
   * @param vfs 현재 VFS 컨텍스트
   * @param showHidden 숨김 노드와 pseudo entry 포함 여부
   * @return ls 표시 대상 노드 목록
   */
  private List<VfsNode> listDirectoryChildren(
      String targetPath, VfsContext vfs, boolean showHidden) {
    // VFS의 실제 자식 노드를 조회한 뒤 출력 대상만 남긴다.
    List<VfsNode> children =
        vfs.listChildren(targetPath).stream()
            // -a가 없으면 숨김 노드를 제외하고, -a가 있으면 숨김 노드도 포함한다.
            .filter(n -> showHidden || !n.hidden())
            // seed와 런타임 출력이 흔들리지 않도록 이름 기준으로 정렬한다.
            .sorted(Comparator.comparing(VfsNode::name))
            // . / .. pseudo entry를 앞에 추가해야 하므로 수정 가능한 리스트로 수집한다.
            .collect(Collectors.toCollection(ArrayList::new));

    // -a 옵션이 있을 때만 실제 ls처럼 . / .. 항목을 표시 목록에 추가한다.
    if (showHidden) {
      // . 은 현재 디렉토리를 가리키는 pseudo entry다.
      children.add(0, createPseudoDirectoryNode(targetPath, "."));
      // .. 은 부모 디렉토리를 가리키는 pseudo entry다.
      children.add(1, createPseudoDirectoryNode(parentPathOf(targetPath, vfs), ".."));
    }

    // 옵션에 맞게 필터링되고 정렬된 표시 대상 노드 목록을 반환한다.
    return children;
  }

  /**
   * ls -a에서 표시되는 . 또는 .. pseudo entry를 만든다.
   *
   * @param path pseudo entry가 가리키는 절대 경로
   * @param name 표시할 이름
   * @return 디렉토리형 VFS 노드
   */
  private VfsNode createPseudoDirectoryNode(String path, String name) {
    // . / .. 는 실제 파일 콘텐츠가 없는 읽기 가능한 디렉토리 노드로만 표현한다.
    return new VfsNode(path, name, "directory", true, true, false, false, null, null, null);
  }

  /**
   * 부모 경로를 계산한다.
   *
   * @param targetPath 현재 경로
   * @param vfs 현재 VFS 컨텍스트
   * @return 부모 절대 경로, 루트이면 루트 경로
   */
  private String parentPathOf(String targetPath, VfsContext vfs) {
    // null, 루트, 슬래시 없는 값은 더 올라갈 부모가 없으므로 VFS 루트로 고정한다.
    if (targetPath == null || targetPath.equals(vfs.getRootPath()) || !targetPath.contains("/")) {
      return vfs.getRootPath();
    }

    // 마지막 슬래시 위치를 기준으로 부모 경로를 잘라낸다.
    int lastSlash = targetPath.lastIndexOf('/');
    // /foo 형태는 부모가 루트이고, 그 외에는 마지막 슬래시 앞부분이 부모 경로다.
    return lastSlash <= 0 ? "/" : targetPath.substring(0, lastSlash);
  }

  /**
   * long listing total 값을 계산한다.
   *
   * <p>현재 VFS는 실제 디스크를 쓰지 않으므로, 표시되는 각 엔트리를 4KB block 하나로 간주해 seed의 {@code total}과 같은 기준을 적용한다.
   *
   * @param entries long listing에 표시되는 엔트리 목록
   * @return ls total 값
   */
  private int calculateTotalBlocks(List<VfsNode> entries) {
    // 화면에 표시되는 각 entry의 block 수를 합산해 total 값을 만든다.
    return entries.stream().mapToInt(this::estimateBlockCount).sum();
  }

  /**
   * VFS 노드의 block 수를 추정한다.
   *
   * @param node 대상 노드
   * @return 현재 VFS의 기본 block 수
   */
  private int estimateBlockCount(VfsNode node) {
    // 현재 VFS는 실제 디스크 block 정보를 갖지 않으므로 표시 entry 하나를 4 block으로 본다.
    return 4;
  }

  /**
   * VFS 노드를 ls -l 스타일 한 줄로 포맷한다.
   *
   * @param node 출력할 VFS 노드
   * @return long listing 라인
   */
  private String formatLongListingLine(VfsNode node) {
    // 파일/디렉토리/실행 가능 여부에 따라 권한 문자열을 계산한다.
    String permissions = resolvePermissionText(node);
    // .. pseudo entry는 부모 디렉토리 의미를 살리기 위해 root 소유자로 표시한다.
    String owner = "..".equals(node.name()) ? "root" : "guest";
    // 소유자와 같은 기준으로 그룹명을 표시한다.
    String group = "..".equals(node.name()) ? "root" : "guest";
    // 디렉토리는 4096으로 고정하고 파일은 VFS 이름 기반 표시 크기를 사용한다.
    int size = node.isDirectory() ? 4096 : estimateDisplaySize(node);
    // seed의 ls -al 출력 형태와 맞는 고정 날짜 및 컬럼 배치로 한 줄을 만든다.
    return String.format(
        "%s  1 %-5s %-5s %4d Apr 14 23:16 %s", permissions, owner, group, size, node.name());
  }

  /**
   * VFS 노드 권한 문자열을 계산한다.
   *
   * @param node 대상 노드
   * @return ls -l 권한 문자열
   */
  private String resolvePermissionText(VfsNode node) {
    // 디렉토리는 읽기/진입 가능한 기본 디렉토리 권한으로 표시한다.
    if (node.isDirectory()) {
      return "drwxr-xr-x";
    }

    // 숨김 파일은 히스토리 파일처럼 소유자만 읽고 쓸 수 있는 형태로 표시한다.
    if (node.hidden()) {
      return "-rw-------";
    }

    // 실행 가능 파일이면 x 권한을 주고, 일반 파일이면 읽기 전용 형태로 표시한다.
    return node.executable() ? "-rwxr-xr-x" : "-rw-r--r--";
  }

  /**
   * long listing에 표시할 파일 크기를 추정한다.
   *
   * @param node 대상 파일 노드
   * @return 표시 크기
   */
  private int estimateDisplaySize(VfsNode node) {
    // 별도 파일 크기 메타데이터가 없으므로 파일명 길이 기반의 안정적인 표시 크기를 만든다.
    return Math.max(1, node.name().length() * 32);
  }

  /**
   * 일반 ls에 표시할 이름을 포맷한다.
   *
   * @param node 대상 노드
   * @return 표시 이름
   */
  private String formatDisplayName(VfsNode node) {
    // . / .. pseudo entry는 실제 ls -a처럼 슬래시를 붙이지 않는다.
    if (isPseudoDirectory(node)) {
      return node.name();
    }

    // 실제 디렉토리는 기존 기본 ls 출력과 동일하게 뒤에 /를 붙인다.
    return node.isDirectory() ? node.name() + "/" : node.name();
  }

  /**
   * ls -a 전용 pseudo directory 여부를 확인한다.
   *
   * @param node 대상 노드
   * @return . 또는 .. 이면 true
   */
  private boolean isPseudoDirectory(VfsNode node) {
    // 이름이 . 또는 .. 이면 ls -a 표시를 위해 만든 pseudo directory로 판단한다.
    return ".".equals(node.name()) || "..".equals(node.name());
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
      String targetPath = pathResolver.resolve(cwd, rawRoot, vfs);
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
    String targetPath = pathResolver.resolve(cwd, command.args().get(0), vfs);
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
    String targetPath = pathResolver.resolve(cwd, command.args().get(0), vfs);
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

    // FileContentService를 통해 현재 챕터의 contents.json에서 실제 텍스트 내용을 가져옵니다.
    List<String> content = fileContentService.getContent(vfs.getChapterCode(), node.contentKey());
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
    String targetPath = pathResolver.resolve(cwd, command.args().get(0), vfs);
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
    return vfs.getPromptUser() + "@" + vfs.getPromptHost() + ":" + displayCwd + "$";
  }
}
