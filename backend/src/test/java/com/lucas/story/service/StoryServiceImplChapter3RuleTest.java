package com.lucas.story.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lucas.chapter.entity.Chapter;
import com.lucas.story.dto.request.TransitionRequestDto;
import com.lucas.story.entity.StoryNode;
import com.lucas.story.entity.StoryTransition;
import com.lucas.story.repository.StoryNodeRepository;
import com.lucas.story.repository.StoryTransitionRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class StoryServiceImplChapter3RuleTest {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private StoryServiceImpl storyService;

  @BeforeEach
  void setUp() {
    storyService =
        new StoryServiceImpl(
            null, null, null, null, null, null, null, null, null, null, objectMapper);
    storyService.init();
  }

  @Test
  void findStartNodePrefersConfiguredChapter3StartNode() {
    StoryNodeRepository storyNodeRepository = mock(StoryNodeRepository.class);
    StoryNode configuredStart = storyNode("CH3_FRIEND_CALL");

    storyService =
        new StoryServiceImpl(
            null,
            null,
            storyNodeRepository,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            objectMapper);

    when(storyNodeRepository.findByChapter_CodeAndCode("week03", "CH3_FRIEND_CALL"))
        .thenReturn(Optional.of(configuredStart));

    Optional<StoryNode> result =
        ReflectionTestUtils.invokeMethod(storyService, "findStartNodeOptional", "week03");

    assertThat(result).containsSame(configuredStart);
    verify(storyNodeRepository, never()).findFirstByChapter_CodeOrderByIdAsc("week03");
  }

  @Test
  void normalizedCommandAcceptsChapter3AcceptedForms() throws Exception {
    assertThat(
            matches(
                "NORMALIZED_COMMAND",
                """
                {
                  "rule": "NORMALIZED_COMMAND",
                  "acceptedForms": [
                    { "command": "ls", "argsAnyOrder": ["-al"] },
                    { "command": "ls", "argsAnyOrder": ["-la"] }
                  ],
                  "cwd": "/home/guest"
                }
                """,
                "ls -la",
                baseSnapshot()))
        .isTrue();
  }

  @Test
  void relayDiscoveryConnectAndDumpRulesMatch() throws Exception {
    JsonNode snapshot = baseSnapshot();

    assertThat(
            matches(
                "DISCOVER_OPEN_PORT",
                """
                {
                  "rule": "DISCOVER_OPEN_PORT",
                  "targetPort": 9091,
                  "acceptedMethods": [
                    {
                      "command": "nmap",
                      "requiredArgs": ["-sV"],
                      "acceptedTargets": ["127.0.0.1", "localhost"]
                    },
                    {
                      "command": "nc",
                      "requiredArgsAnyOrder": ["-zv"],
                      "acceptedHosts": ["127.0.0.1", "localhost"],
                      "acceptedPorts": [9091]
                    }
                  ]
                }
                """,
                "nmap -sV 127.0.0.1",
                snapshot))
        .isTrue();

    assertThat(
            matches(
                "CONNECT_RELAY",
                """
                {
                  "rule": "CONNECT_RELAY",
                  "hostAliases": ["127.0.0.1", "localhost"],
                  "port": 9091,
                  "acceptedCommands": ["nc"],
                  "stdinRequired": false,
                  "requiredFlags": ["port_9091_discovered"]
                }
                """,
                "nc -w 3 127.0.0.1 9091",
                snapshot))
        .isTrue();

    assertThat(
            matches(
                "RELAY_REQUEST_TO_FILE",
                """
                {
                  "rule": "RELAY_REQUEST_TO_FILE",
                  "hostAliases": ["127.0.0.1", "localhost"],
                  "port": 9091,
                  "request": "PEOPLE",
                  "requiredFlags": ["relay_contacted"],
                  "outputFile": "/home/guest/my_people.list"
                }
                """,
                "printf 'PEOPLE\\n' | nc 127.0.0.1 9091 > my_people.list",
                snapshot))
        .isTrue();

    assertThat(
            matches(
                "RELAY_REQUEST_TO_FILE",
                """
                {
                  "rule": "RELAY_REQUEST_TO_FILE",
                  "hostAliases": ["127.0.0.1", "localhost"],
                  "port": 9091,
                  "request": "PEOPLE",
                  "requiredFlags": ["relay_contacted"],
                  "outputFile": "/home/guest/my_people.list",
                  "allowAnyOutputFile": true
                }
                """,
                "printf 'PEOPLE\\n' | nc 127.0.0.1 9091 > people.txt",
                snapshot))
        .isTrue();

    assertThat(
            matches(
                "RELAY_REQUEST_TO_FILE",
                """
                {
                  "rule": "RELAY_REQUEST_TO_FILE",
                  "hostAliases": ["127.0.0.1", "localhost"],
                  "port": 9091,
                  "request": "PEOPLE",
                  "requiredFlags": ["relay_contacted"],
                  "outputFile": "/home/guest/my_people.list",
                  "allowAnyOutputFile": true
                }
                """,
                "printf 'people\\n' | nc 127.0.0.1 9091 > people.txt",
                snapshot))
        .isTrue();

    assertThat(
            matches(
                "RELAY_REQUEST",
                """
                {
                  "rule": "RELAY_REQUEST",
                  "hostAliases": ["127.0.0.1", "localhost"],
                  "port": 9091,
                  "request": "STATUS",
                  "requiredFlags": ["relay_contacted"]
                }
                """,
                "nc 127.0.0.1 9091 <<< status",
                snapshot))
        .isTrue();
  }

  @Test
  void relayViewDoesNotConsumeRedirectionMistakes() throws Exception {
    JsonNode snapshot = baseSnapshot();

    assertThat(
            matches(
                "RELAY_REQUEST",
                """
                {
                  "rule": "RELAY_REQUEST",
                  "hostAliases": ["127.0.0.1", "localhost"],
                  "port": 9091,
                  "request": "FRAGMENT",
                  "requiredFlags": ["relay_contacted"]
                }
                """,
                "echo FRAGMENT | nc localhost 9091 < laplace_fra",
                snapshot))
        .isFalse();
  }

  @Test
  void relayDumpNearMissUsesGenericRedirectionNudge() throws Exception {
    StoryTransitionRepository storyTransitionRepository = mock(StoryTransitionRepository.class);
    storyService =
        new StoryServiceImpl(
            null,
            null,
            null,
            storyTransitionRepository,
            null,
            null,
            null,
            null,
            null,
            null,
            objectMapper);
    storyService.init();

    StoryNode currentNode = storyNode("CH3_RELAY_STATUS_VIEW");
    ReflectionTestUtils.setField(currentNode, "id", 208L);

    StoryTransition transition =
        StoryTransition.builder()
            .actionType("command")
            .expectedInput("relay_request_FRAGMENT_to_file")
            .validatorType("server_rule")
            .validatorConfig(
                json(
                    """
                    {
                      "rule": "RELAY_REQUEST_TO_FILE",
                      "hostAliases": ["127.0.0.1", "localhost"],
                      "port": 9091,
                      "request": "FRAGMENT",
                      "requiredFlags": ["relay_contacted"],
                      "outputFile": "/home/guest/laplace_fragment_02.sh"
                    }
                    """))
            .priority(100)
            .build();
    when(storyTransitionRepository.findByFromNode_IdOrderByPriorityDesc(208L))
        .thenReturn(List.of(transition));

    Object command =
        ReflectionTestUtils.invokeMethod(
            storyService, "parseCommand", "echo FRAGMENT | nc localhost 9091 < laplace_fra");

    String nudge =
        ReflectionTestUtils.invokeMethod(
            storyService, "findNudgeForCommand", currentNode, command, baseSnapshot());

    assertThat(nudge).isEqualTo("리다이렉션 방향과 파일 경로를 다시 확인해봐.");
  }

  @Test
  void relayDumpSnapshotUsesUserOutputFileWhenAllowed() throws Exception {
    JsonNode snapshot = baseSnapshot();
    StoryNode nextNode = storyNode("CH3_PEOPLE_DUMPED");
    TransitionRequestDto request = request("echo PEOPLE | nc -w 3 127.0.0.1 9091 > people.txt");
    JsonNode effectBundle =
        json(
            """
            {
              "vfsOverlay": {
                "createdNodes": [
                  {
                    "path": "/home/guest/my_people.list",
                    "pathFromOutputFile": true,
                    "type": "file",
                    "readable": true,
                    "contentKey": "CH3_MY_PEOPLE_LIST"
                  }
                ]
              }
            }
            """);

    JsonNode nextSnapshot =
        ReflectionTestUtils.invokeMethod(
            storyService,
            "createTransitionSnapshot",
            nextNode.getChapter(),
            nextNode,
            snapshot,
            request,
            effectBundle);

    JsonNode createdNodes = nextSnapshot.at("/vfsOverlay/createdNodes");
    assertThat(createdNodes.findValuesAsText("path")).contains("/home/guest/people.txt");
    assertThat(createdNodes.findValues("pathFromOutputFile")).isEmpty();
  }

  @Test
  void coreGroupValidationSeparatesSuccessAndFailureBranches() throws Exception {
    JsonNode snapshot = baseSnapshot();
    String successConfig =
        """
        {
          "rule": "VALIDATE_CORE_GROUP_DAT",
          "targetFile": "/home/guest/core_group.dat",
          "canonicalAllowedLines": [
            "Home_Contact ACTIVE",
            "Old_Contact ACTIVE",
            "Classmate_21 ACTIVE"
          ],
          "sourceStatusLines": [
            "Home_Contact ACTIVE",
            "Old_Contact ACTIVE",
            "Friend_04 DELETED",
            "Classmate_21 ACTIVE",
            "Unknown_719 UNKNOWN"
          ],
          "filterSourceContentKeys": ["CH3_MY_PEOPLE_LIST"],
          "rejectStatuses": ["DELETED", "UNKNOWN"],
          "allowDuplicateLines": false,
          "allowMissingActiveNode": false,
          "requiredFlags": ["social_isolation_ready"],
          "requiredKnowledge": {
            "people": ["people_viewed", "people_dumped"],
            "monitor": ["monitor_viewed", "monitor_dumped"]
          }
        }
        """;
    String failureConfig =
        successConfig.replace(
            "\"requiredKnowledge\"", "\"expectFailure\": true,\n  \"requiredKnowledge\"");

    String validInput =
        "printf 'Home_Contact ACTIVE\\nOld_Contact ACTIVE\\nClassmate_21 ACTIVE\\n' > core_group.dat";
    String invalidInput =
        "printf 'Home_Contact ACTIVE\\nFriend_04 DELETED\\nClassmate_21 ACTIVE\\n' > core_group.dat";
    String grepValidInput = "grep ' ACTIVE$' people.txt > core_group.dat";
    String awkValidInput = "awk '$2 == \"ACTIVE\" { print $0 }' people.txt > core_group.dat";
    String sedValidInput = "sed -n '/ ACTIVE$/p' people.txt > core_group.dat";
    String grepInvalidInput = "grep DELETED people.txt > core_group.dat";
    String grepInvertInvalidInput = "grep -v ACTIVE people.txt > core_group.dat";

    assertThat(matches("VALIDATE_CORE_GROUP_DAT", successConfig, validInput, snapshot)).isTrue();
    assertThat(matches("VALIDATE_CORE_GROUP_DAT", failureConfig, validInput, snapshot)).isFalse();
    assertThat(matches("VALIDATE_CORE_GROUP_DAT", successConfig, invalidInput, snapshot)).isFalse();
    assertThat(matches("VALIDATE_CORE_GROUP_DAT", failureConfig, invalidInput, snapshot)).isTrue();
    assertThat(matches("VALIDATE_CORE_GROUP_DAT", successConfig, grepValidInput, snapshot))
        .isTrue();
    assertThat(matches("VALIDATE_CORE_GROUP_DAT", successConfig, awkValidInput, snapshot)).isTrue();
    assertThat(matches("VALIDATE_CORE_GROUP_DAT", successConfig, sedValidInput, snapshot)).isTrue();
    assertThat(matches("VALIDATE_CORE_GROUP_DAT", successConfig, grepInvalidInput, snapshot))
        .isFalse();
    assertThat(matches("VALIDATE_CORE_GROUP_DAT", failureConfig, grepInvalidInput, snapshot))
        .isTrue();
    assertThat(matches("VALIDATE_CORE_GROUP_DAT", successConfig, grepInvertInvalidInput, snapshot))
        .isFalse();
    assertThat(matches("VALIDATE_CORE_GROUP_DAT", failureConfig, grepInvertInvalidInput, snapshot))
        .isTrue();
  }

  @Test
  void lateChapterFileRulesMatch() throws Exception {
    JsonNode snapshot = baseSnapshot();
    JsonNode localSnapshot =
        json(
            baseSnapshot()
                .toString()
                .replace("\"cwd\":\"/home/guest\"", "\"cwd\":\"/usr/bin/local\""));

    assertThat(
            matches(
                "GPG_OUTPUT_EXISTS",
                """
                {
                  "rule": "GPG_OUTPUT_EXISTS",
                  "inputFile": "/home/guest/core_group.dat",
                  "expectedOutput": "/home/guest/core_group.dat.gpg",
                  "requiredFlags": ["core_group_validated"]
                }
                """,
                "gpg -c -o core_group.dat.gpg core_group.dat",
                snapshot))
        .isTrue();

    assertThat(
            matches(
                "FILE_EQUIVALENCE",
                """
                {
                  "rule": "FILE_EQUIVALENCE",
                  "targetFile": "/tmp/safe_zone.dat.gpg",
                  "equivalentTo": "/home/guest/core_group.dat.gpg",
                  "acceptedCommands": ["mv", "cp", "cat"],
                  "requiredFlags": ["core_group_encrypted"]
                }
                """,
                "cp core_group.dat.gpg /tmp/safe_zone.dat.gpg",
                snapshot))
        .isTrue();

    assertThat(
            matches(
                "CONFIRMATION_STREAM_TO_SCRIPT",
                """
                {
                  "rule": "CONFIRMATION_STREAM_TO_SCRIPT",
                  "scriptPath": "/home/guest/sever_external_nodes.sh",
                  "acceptedConfirmationTokens": ["y", "yes"],
                  "minimumConfirmations": 3,
                  "requiredFlags": ["external_sever_attempted", "safe_zone_registered"]
                }
                """,
                "printf 'y\\ny\\ny\\n' | sh sever_external_nodes.sh",
                snapshot))
        .isTrue();

    assertThat(
            matches(
                "DISCOVER_FILE",
                """
                {
                  "rule": "DISCOVER_FILE",
                  "targetFile": "/usr/bin/local/laplace_fragment_03.sh",
                  "acceptedCommands": ["ls", "find"],
                  "requiredFlags": ["ghost_mode_enabled"]
                }
                """,
                "ls /usr/bin/local/laplace_fragment_03.sh",
                snapshot))
        .isTrue();

    assertThat(
            matches(
                "DISCOVER_FILE",
                """
                {
                  "rule": "DISCOVER_FILE",
                  "targetFile": "/usr/bin/local/laplace_fragment_03.sh",
                  "acceptedCommands": ["ls", "find"],
                  "requiredFlags": ["ghost_mode_enabled"]
                }
                """,
                "cd /usr/bin/local && ls",
                snapshot))
        .isTrue();

    assertThat(
            matches(
                "DISCOVER_FILE",
                """
                {
                  "rule": "DISCOVER_FILE",
                  "targetFile": "/usr/bin/local/laplace_fragment_03.sh",
                  "acceptedCommands": ["ls", "find"],
                  "requiredFlags": ["ghost_mode_enabled"]
                }
                """,
                "find /usr/bin/local -name laplace_fragment_03.sh",
                snapshot))
        .isTrue();

    assertThat(
            matches(
                "DISCOVER_FILE",
                """
                {
                  "rule": "DISCOVER_FILE",
                  "targetFile": "/usr/bin/local/laplace_fragment_03.sh",
                  "acceptedCommands": ["ls", "find"],
                  "requiredFlags": ["ghost_mode_enabled"]
                }
                """,
                "ls",
                localSnapshot))
        .isTrue();

    assertThat(
            matches(
                "CREATE_FILE_EQUIVALENT",
                """
                {
                  "rule": "CREATE_FILE_EQUIVALENT",
                  "sourceFile": "/usr/bin/local/laplace_fragment_03.sh",
                  "targetFile": "/home/guest/laplace_fragment_03.sh",
                  "acceptedCommands": ["cp", "cat"],
                  "requiredFlags": ["fragment03_found"]
                }
                """,
                "cp laplace_fragment_03.sh ~/laplace_fragment_03.sh",
                localSnapshot))
        .isTrue();

    assertThat(
            matches(
                "FILE_COMPOSITION",
                """
                {
                  "rule": "FILE_COMPOSITION",
                  "targetFile": "/home/guest/laplace.qasm",
                  "orderedSources": [
                    "/home/guest/laplace_fragment_01.sh",
                    "/home/guest/laplace_fragment_02.sh",
                    "/home/guest/laplace_fragment_03.sh"
                  ],
                  "requiredFlags": ["fragment03_copied"]
                }
                """,
                "cat laplace_fragment_01.sh laplace_fragment_02.sh laplace_fragment_03.sh > laplace.qasm",
                snapshot))
        .isTrue();

    assertThat(
            matches(
                "HASH_FILE_CHECK",
                """
                {
                  "rule": "HASH_FILE_CHECK",
                  "targetFile": "/home/guest/laplace.qasm",
                  "acceptedCommands": [
                    { "command": "sha256sum" },
                    { "command": "shasum", "requiredArgs": ["-a", "256"] }
                  ],
                  "requiredFlags": ["laplace_qasm_created"]
                }
                """,
                "shasum -a 256 laplace.qasm",
                snapshot))
        .isTrue();
  }

  private boolean matches(String rule, String configJson, String input, JsonNode snapshot)
      throws Exception {
    StoryTransition transition =
        StoryTransition.builder()
            .actionType("command")
            .expectedInput(rule)
            .validatorType("server_rule")
            .validatorConfig(json(configJson))
            .priority(100)
            .build();

    return Boolean.TRUE.equals(
        ReflectionTestUtils.invokeMethod(
            storyService, "matchesServerRuleTransition", transition, request(input), snapshot));
  }

  private TransitionRequestDto request(String input) {
    TransitionRequestDto request = new TransitionRequestDto();
    ReflectionTestUtils.setField(request, "actionType", "command");
    ReflectionTestUtils.setField(request, "inputValue", input);
    return request;
  }

  private StoryNode storyNode(String code) {
    return StoryNode.builder()
        .chapter(Chapter.builder().code("week03").title("Chapter 3").sortOrder(3).build())
        .code(code)
        .nodeType("narrative")
        .outputBundle(objectMapper.createObjectNode())
        .promptType("click")
        .build();
  }

  private JsonNode baseSnapshot() throws Exception {
    return json(
        """
        {
          "chapterCode": "week03",
          "terminal": {
            "cwd": "/home/guest"
          },
          "flags": {
            "port_9091_discovered": true,
            "relay_contacted": true,
            "people_viewed": true,
            "monitor_viewed": true,
            "social_isolation_ready": true,
            "core_group_validated": true,
            "core_group_encrypted": true,
            "safe_zone_registered": true,
            "external_sever_attempted": true,
            "ghost_mode_enabled": true,
            "fragment03_found": true,
            "fragment03_copied": true,
            "laplace_qasm_created": true
          },
          "vfsOverlay": {
            "createdNodes": [
              {
                "path": "/home/guest/people.txt",
                "type": "file",
                "readable": true,
                "contentKey": "CH3_MY_PEOPLE_LIST"
              },
              {
                "path": "/home/guest/laplace_fragment_02.sh",
                "type": "file",
                "readable": true,
                "executable": true,
                "contentKey": "LAPLACE_FRAGMENT_02"
              },
              {
                "path": "/home/guest/laplace_fragment_03.sh",
                "type": "file",
                "readable": true,
                "executable": true,
                "contentKey": "LAPLACE_FRAGMENT_03"
              },
              {
                "path": "/home/guest/core_group.dat",
                "type": "file",
                "readable": true,
                "contentKey": "CH3_CORE_GROUP_DAT"
              },
              {
                "path": "/home/guest/core_group.dat.gpg",
                "type": "file",
                "readable": true,
                "contentKey": "CH3_CORE_GROUP_GPG"
              },
              {
                "path": "/home/guest/laplace.qasm",
                "type": "file",
                "readable": true,
                "contentKey": "LAPLACE_QASM"
              }
            ],
            "removedPaths": [],
            "modifiedNodes": []
          }
        }
        """);
  }

  private JsonNode json(String value) throws Exception {
    return objectMapper.readTree(value);
  }
}
