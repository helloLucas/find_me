package com.lucas.story.service.terminal;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class TerminalCommandService {

  private final FileContentService fileContentService;
  private final PathResolver pathResolver = new PathResolver();

  private static final List<String> DANGEROUS_COMMANDS =
      Arrays.asList("rm", "mv", "cp", "chmod", "chown", "sudo", "su", "apt", "yum", "wget", "curl");

  public TerminalResult execute(ParsedCommand command, JsonNode snapshot, VfsContext vfs) {
    String cmd = command.command().toLowerCase();
    String cwd = snapshot.path("cwd").asText(vfs.getRootPath());

    // 위험 명령 체크
    if (DANGEROUS_COMMANDS.contains(cmd)) {
      return buildErrorResult(cwd, vfs, "[DENIED] This action is restricted by security policy.");
    }

    return switch (cmd) {
      case "pwd" -> handlePwd(cwd, vfs);
      case "ls" -> handleLs(command, cwd, vfs);
      case "cd" -> handleCd(command, cwd, vfs);
      case "cat" -> handleCat(command, cwd, vfs);
      case "sh" -> handleSh(command, cwd, vfs);
      case "clear" -> handleClear(cwd, vfs);
      default -> buildErrorResult(cwd, vfs, cmd + ": command not found");
    };
  }

  private TerminalResult handlePwd(String cwd, VfsContext vfs) {
    return TerminalResult.builder()
        .stdout(Collections.singletonList(cwd))
        .cwd(cwd)
        .prompt(buildPrompt(cwd, vfs))
        .resultCode("SUCCESS")
        .build();
  }

  private TerminalResult handleLs(ParsedCommand command, String cwd, VfsContext vfs) {
    String targetPath =
        command.args().isEmpty()
            ? cwd
            : pathResolver.resolve(cwd, command.args().get(0), vfs.getRootPath());
    VfsNode node = vfs.resolve(targetPath);

    if (node == null) {
      return buildErrorResult(
          cwd, vfs, "ls: " + command.args().get(0) + ": No such file or directory");
    }

    if (node.isFile()) {
      return TerminalResult.builder()
          .stdout(Collections.singletonList(node.name()))
          .cwd(cwd)
          .prompt(buildPrompt(cwd, vfs))
          .resultCode("SUCCESS")
          .build();
    }

    List<VfsNode> children = vfs.listChildren(targetPath);
    List<String> output =
        children.stream().filter(n -> !n.hidden()).map(VfsNode::name).collect(Collectors.toList());

    return TerminalResult.builder()
        .stdout(
            output.isEmpty()
                ? new ArrayList<>()
                : Collections.singletonList(String.join("  ", output)))
        .cwd(cwd)
        .prompt(buildPrompt(cwd, vfs))
        .resultCode("SUCCESS")
        .build();
  }

  private TerminalResult handleCd(ParsedCommand command, String cwd, VfsContext vfs) {
    if (command.args().isEmpty()) {
      return TerminalResult.builder()
          .cwd(vfs.getRootPath())
          .prompt(buildPrompt(vfs.getRootPath(), vfs))
          .resultCode("SUCCESS")
          .build();
    }

    String targetPath = pathResolver.resolve(cwd, command.args().get(0), vfs.getRootPath());
    VfsNode node = vfs.resolve(targetPath);

    if (node == null) {
      return buildErrorResult(
          cwd, vfs, "cd: " + command.args().get(0) + ": No such file or directory");
    }

    if (node.isFile()) {
      return buildErrorResult(cwd, vfs, "cd: " + command.args().get(0) + ": Not a directory");
    }

    if (node.isProtected()) {
      return buildErrorResult(cwd, vfs, "cd: " + command.args().get(0) + ": Permission denied");
    }

    return TerminalResult.builder()
        .cwd(targetPath)
        .prompt(buildPrompt(targetPath, vfs))
        .resultCode("SUCCESS")
        .build();
  }

  private TerminalResult handleCat(ParsedCommand command, String cwd, VfsContext vfs) {
    if (command.args().isEmpty()) {
      return TerminalResult.builder()
          .cwd(cwd)
          .prompt(buildPrompt(cwd, vfs))
          .resultCode("SUCCESS")
          .build();
    }

    String targetPath = pathResolver.resolve(cwd, command.args().get(0), vfs.getRootPath());
    VfsNode node = vfs.resolve(targetPath);

    if (node == null) {
      return buildErrorResult(
          cwd, vfs, "cat: " + command.args().get(0) + ": No such file or directory");
    }

    if (node.isDirectory()) {
      return buildErrorResult(cwd, vfs, "cat: " + command.args().get(0) + ": Is a directory");
    }

    if (!node.readable()) {
      return buildErrorResult(cwd, vfs, "cat: " + command.args().get(0) + ": Permission denied");
    }

    List<String> content = fileContentService.getContent(node.contentKey());
    return TerminalResult.builder()
        .stdout(content)
        .cwd(cwd)
        .prompt(buildPrompt(cwd, vfs))
        .resultCode("SUCCESS")
        .build();
  }

  private TerminalResult handleSh(ParsedCommand command, String cwd, VfsContext vfs) {
    if (command.args().isEmpty()) {
      return buildErrorResult(cwd, vfs, "sh: missing operand");
    }

    String targetPath = pathResolver.resolve(cwd, command.args().get(0), vfs.getRootPath());
    VfsNode node = vfs.resolve(targetPath);

    if (node == null) {
      return buildErrorResult(
          cwd, vfs, "sh: " + command.args().get(0) + ": No such file or directory");
    }

    // lukas_fragment_01.sh 전용 에러 메시지 (사용자 요구사항)
    if ("LUCAS_FRAGMENT_01".equals(node.contentKey())) {
      return TerminalResult.builder()
          .stderr(Arrays.asList("[FAILED] 이 파편은 독립적으로 실행되지 않습니다.", "[TRACE] 외부 관측자 입력이 필요한 상태입니다."))
          .cwd(cwd)
          .prompt(buildPrompt(cwd, vfs))
          .resultCode("ERROR")
          .build();
    }

    return buildErrorResult(cwd, vfs, "sh: " + node.name() + ": Permission denied");
  }

  private TerminalResult handleClear(String cwd, VfsContext vfs) {
    return TerminalResult.builder()
        .stdout(Collections.singletonList("__CLEAR_TERMINAL__"))
        .cwd(cwd)
        .prompt(buildPrompt(cwd, vfs))
        .resultCode("SUCCESS")
        .build();
  }

  private TerminalResult buildErrorResult(String cwd, VfsContext vfs, String errorMsg) {
    return TerminalResult.builder()
        .stderr(Collections.singletonList(errorMsg))
        .cwd(cwd)
        .prompt(buildPrompt(cwd, vfs))
        .resultCode("ERROR")
        .build();
  }

  private String buildPrompt(String cwd, VfsContext vfs) {
    String displayCwd = cwd.equals(vfs.getRootPath()) ? "~" : cwd.replace(vfs.getRootPath(), "~");
    return "guest@lucas-server:" + displayCwd + "$";
  }
}
