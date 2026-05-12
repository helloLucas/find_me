package com.lucas.story.service.terminal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class TerminalCommandServiceRootPermissionTest {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final TerminalCommandService terminalCommandService =
      new TerminalCommandService(mock(FileContentService.class));

  @Test
  void rootShellCanReenterRootDirectoryAfterMovingToParent() throws Exception {
    VfsContext vfs = VfsContext.of(staticVfs(), overlay("root", "universe-core"));

    TerminalResult result =
        terminalCommandService.execute(
            new ParsedCommand("cd", List.of("root"), "cd root"), terminal("/"), vfs);

    assertThat(result.resultCode()).isEqualTo("SUCCESS");
    assertThat(result.cwd()).isEqualTo("/root");
    assertThat(result.prompt()).isEqualTo("root@universe-core:/root#");
  }

  @Test
  void rootShellCdWithoutArgsReturnsRootHome() throws Exception {
    VfsContext vfs = VfsContext.of(staticVfs(), overlay("root", "universe-core"));

    TerminalResult result =
        terminalCommandService.execute(
            new ParsedCommand("cd", List.of(), "cd"), terminal("/"), vfs);

    assertThat(result.resultCode()).isEqualTo("SUCCESS");
    assertThat(result.cwd()).isEqualTo("/root");
  }

  @Test
  void guestShellStillCannotEnterProtectedRootDirectory() throws Exception {
    VfsContext vfs = VfsContext.of(staticVfs(), overlay("guest", "lucas-server"));

    TerminalResult result =
        terminalCommandService.execute(
            new ParsedCommand("cd", List.of("/root"), "cd /root"), terminal("/"), vfs);

    assertThat(result.resultCode()).isEqualTo("ERROR");
    assertThat(result.stderr()).containsExactly("cd: /root: Permission denied");
  }

  @Test
  void universeCoreRootShellDoesNotExposeLucasServerHomeDirectly() throws Exception {
    VfsContext vfs = VfsContext.of(staticVfs(), overlay("root", "universe-core"));

    TerminalResult result =
        terminalCommandService.execute(
            new ParsedCommand("cd", List.of("/home/guest"), "cd /home/guest"),
            terminal("/root"),
            vfs);

    assertThat(result.resultCode()).isEqualTo("ERROR");
    assertThat(result.stderr()).containsExactly("cd: /home/guest: No such file or directory");
  }

  @Test
  void executeMountedLaplaceReportsConfirmationContext() throws Exception {
    VfsContext vfs = VfsContext.of(staticVfs(), mountedOverlay());

    TerminalResult result =
        terminalCommandService.execute(
            new ParsedCommand(
                "execute",
                List.of("/mnt/lucas-server/laplace.qasm"),
                "execute /mnt/lucas-server/laplace.qasm"),
            terminal("/root"),
            vfs);

    assertThat(result.resultCode()).isEqualTo("SUCCESS");
    assertThat(result.stdout())
        .containsExactly(
            "execute: /mnt/lucas-server/laplace.qasm",
            "Laplace execution requires explicit confirmation.");
  }

  @Test
  void executeLaplaceBeforeMountExplainsMissingMount() throws Exception {
    VfsContext vfs = VfsContext.of(staticVfs(), overlay("root", "universe-core"));

    TerminalResult result =
        terminalCommandService.execute(
            new ParsedCommand(
                "execute",
                List.of("/mnt/lucas-server/laplace.qasm"),
                "execute /mnt/lucas-server/laplace.qasm"),
            terminal("/root"),
            vfs);

    assertThat(result.resultCode()).isEqualTo("ERROR");
    assertThat(result.stderr())
        .containsExactly(
            "execute: /mnt/lucas-server/laplace.qasm: No such file or directory. "
                + "mount lucas-server:/home/guest /mnt/lucas-server first");
  }

  @Test
  void mountCommandShowsLucasServerMountWhenOverlayExists() throws Exception {
    VfsContext vfs = VfsContext.of(staticVfs(), mountedOverlay());

    TerminalResult result =
        terminalCommandService.execute(
            new ParsedCommand("mount", List.of(), "mount"), terminal("/root"), vfs);

    assertThat(result.resultCode()).isEqualTo("SUCCESS");
    assertThat(result.stdout())
        .containsExactly("lucas-server:/home/guest on /mnt/lucas-server type 9p (ro,lucas-key)");
  }

  @Test
  void mountCommandAcceptsEquivalentLucasServerSources() throws Exception {
    VfsContext vfs = VfsContext.of(staticVfs(), overlay("root", "universe-core"));

    List<List<String>> acceptedArgs =
        List.of(
            List.of("/mnt/lucas-server"),
            List.of("-a"),
            List.of("lucas-server:/home/guest", "/mnt/lucas-server"),
            List.of("lucas-server:/home/guest/", "/mnt/lucas-server"),
            List.of("lucas-server:~/", "/mnt/lucas-server"),
            List.of("guest@lucas-server:/home/guest", "/mnt/lucas-server"),
            List.of("-t", "9p", "lucas-server:/home/guest", "/mnt/lucas-server"),
            List.of("-t", "nfs", "-o", "ro", "lucas-server:~/", "/mnt/lucas-server/"));

    for (List<String> args : acceptedArgs) {
      TerminalResult result =
          terminalCommandService.execute(
              new ParsedCommand("mount", args, "mount " + String.join(" ", args)),
              terminal("/root"),
              vfs);

      assertThat(result.stderr())
          .as("accepted mount form: %s", args)
          .containsExactly(
              "mount: /mnt/lucas-server: not mounted yet; use the current root session prompt to attach lucas-server");
    }
  }

  private JsonNode staticVfs() throws Exception {
    return objectMapper.readTree(
        """
        {
          "chapterCode": "week04",
          "rootPath": "/home/guest",
          "defaultCwd": "/home/guest",
          "prompt": { "user": "guest", "host": "lucas-server" },
          "policies": {
            "denyOutsideRoot": false,
            "allowedExternalPaths": ["/", "/home", "/home/guest", "/root", "/mnt", "/mnt/lucas-server"]
          },
          "nodes": {
            "/": {
              "type": "directory",
              "name": "root",
              "readable": true,
              "executable": true,
              "protected": false
            },
            "/home": {
              "type": "directory",
              "name": "home",
              "readable": true,
              "executable": true,
              "protected": false
            },
            "/home/guest": {
              "type": "directory",
              "name": "guest",
              "readable": true,
              "executable": true,
              "protected": false
            },
            "/root": {
              "type": "directory",
              "name": "root",
              "readable": true,
              "executable": true,
              "protected": true
            },
            "/mnt": {
              "type": "directory",
              "name": "mnt",
              "readable": true,
              "executable": true,
              "protected": true
            },
            "/mnt/lucas-server": {
              "type": "directory",
              "name": "lucas-server",
              "readable": true,
              "executable": true,
              "protected": true
            }
          }
        }
        """);
  }

  private JsonNode overlay(String user, String host) throws Exception {
    return objectMapper.readTree(
        """
        {
          "promptUser": "%s",
          "promptHost": "%s"
        }
        """
            .formatted(user, host));
  }

  private JsonNode mountedOverlay() throws Exception {
    return objectMapper.readTree(
        """
        {
          "promptUser": "root",
          "promptHost": "universe-core",
          "createdNodes": [
            {
              "path": "/mnt/lucas-server/laplace.qasm",
              "type": "file",
              "name": "laplace.qasm",
              "readable": true,
              "executable": false,
              "protected": true,
              "hidden": false,
              "contentKey": "CH4_LAPLACE_QASM_PENDING",
              "storyKey": "MOUNTED_LAPLACE_QASM"
            }
          ]
        }
        """);
  }

  private JsonNode terminal(String cwd) throws Exception {
    return objectMapper.readTree(
        """
        {
          "cwd": "%s"
        }
        """.formatted(cwd));
  }
}
