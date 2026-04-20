package com.lucas.story.service;

import com.lucas.global.exception.CustomException;
import com.lucas.global.exception.ErrorCode;
import com.lucas.story.dto.request.TransitionRequestDto;
import com.lucas.story.dto.response.TransitionResponseDto;
import com.lucas.story.dto.response.TransitionResponseDto.EffectDto;
import com.lucas.story.dto.response.TransitionResponseDto.NextNodeDto;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class StoryServiceImpl implements StoryService {

    private static final String ACTION_TYPE_COMMAND = "command";

    @Override
    public TransitionResponseDto processTransition(TransitionRequestDto request) {
        log.info(
                "Processing transition: nodeId={}, actionType={}, inputValue={}",
                request.getNodeId(),
                request.getActionType(),
                request.getInputValue());

        validateActionType(request.getActionType());

        if (!ACTION_TYPE_COMMAND.equals(request.getActionType())) {
            throw new CustomException(ErrorCode.A1001);
        }

        return handleCommandTransition(request);
    }

    private void validateActionType(String actionType) {
        if (actionType == null || actionType.isBlank()) {
            throw new CustomException(ErrorCode.H1000);
        }
        List<String> allowedTypes = List.of("command", "choice", "inspect", "click");
        if (!allowedTypes.contains(actionType)) {
            throw new CustomException(ErrorCode.A1000);
        }
    }

    private TransitionResponseDto handleCommandTransition(TransitionRequestDto request) {
        String inputValue = request.getInputValue();

        if (inputValue == null || inputValue.isBlank()) {
            throw new CustomException(ErrorCode.A1000);
        }

        String trimmedInput = inputValue.trim();

        if (trimmedInput.startsWith("ls")) {
            return buildLsResponse(request.getNodeId(), trimmedInput);
        }

        if (trimmedInput.startsWith("pwd")) {
            return buildPwdResponse(request.getNodeId(), request.getMeta());
        }

        if (trimmedInput.startsWith("whoami")) {
            return buildWhoamiResponse(request.getNodeId());
        }

        if (trimmedInput.startsWith("cat")) {
            return buildCatResponse(request.getNodeId(), trimmedInput);
        }

        // 지원하지 않는 명령어 → Transition not allowed
        throw new CustomException(ErrorCode.A1001);
    }

    // ── Mock 응답 빌더 ────────────────────────────────────────────────────────────

    private TransitionResponseDto buildLsResponse(Long currentNodeId, String input) {
        boolean isLongFormat =
                input.contains("-l") || input.contains("-al") || input.contains("-la");

        String output =
                isLongFormat
                        ? "total 176\n"
                                + "drwxr-xr-x  5 guest guest 4096 Apr 20 12:00 .\n"
                                + "drwxr-xr-x 18 root  root  4096 Apr 19 09:15 ..\n"
                                + "-rw-r--r--  1 guest guest  220 Apr 19 09:15 .bash_logout\n"
                                + "-rw-r--r--  1 guest guest 3526 Apr 19 09:15 .bashrc\n"
                                + "-rw-r--r--  1 guest guest  807 Apr 19 09:15 .profile\n"
                                + "drwxr-xr-x  2 guest guest 4096 Apr 20 11:30 Documents\n"
                                + "drwxr-xr-x  2 guest guest 4096 Apr 20 11:30 Downloads\n"
                                + "-rw-------  1 guest guest 1234 Apr 20 12:00 secret.txt\n"
                        : "Documents  Downloads  secret.txt";

        return TransitionResponseDto.builder()
                .nextNode(
                        NextNodeDto.builder()
                                .id(currentNodeId + 1)
                                .code("CH1_TERM_02")
                                .nodeType("system")
                                .outputBundle(Map.of("stdout", output))
                                .promptType("command")
                                .isCheckpoint(false)
                                .isTerminal(false)
                                .build())
                .snapshot(Map.of("currentDirectory", "/home/guest", "lastCommand", input))
                .effects(
                        List.of(
                                EffectDto.builder().type("append_output").payload(output).build(),
                                EffectDto.builder().type("switch_to_terminal").build()))
                .result("success")
                .build();
    }

    private TransitionResponseDto buildPwdResponse(Long currentNodeId, Map<String, Object> meta) {
        String directory =
                (meta != null && meta.containsKey("directory"))
                        ? String.valueOf(meta.get("directory"))
                        : "/home/guest";

        return TransitionResponseDto.builder()
                .nextNode(
                        NextNodeDto.builder()
                                .id(currentNodeId + 1)
                                .code("CH1_TERM_03")
                                .nodeType("system")
                                .outputBundle(Map.of("stdout", directory))
                                .promptType("command")
                                .isCheckpoint(false)
                                .isTerminal(false)
                                .build())
                .snapshot(Map.of("currentDirectory", directory, "lastCommand", "pwd"))
                .effects(
                        List.of(
                                EffectDto.builder()
                                        .type("append_output")
                                        .payload(directory)
                                        .build(),
                                EffectDto.builder().type("switch_to_terminal").build()))
                .result("success")
                .build();
    }

    private TransitionResponseDto buildWhoamiResponse(Long currentNodeId) {
        String output = "guest";

        return TransitionResponseDto.builder()
                .nextNode(
                        NextNodeDto.builder()
                                .id(currentNodeId + 1)
                                .code("CH1_TERM_04")
                                .nodeType("system")
                                .outputBundle(Map.of("stdout", output))
                                .promptType("command")
                                .isCheckpoint(false)
                                .isTerminal(false)
                                .build())
                .snapshot(Map.of("currentUser", "guest", "lastCommand", "whoami"))
                .effects(
                        List.of(
                                EffectDto.builder().type("append_output").payload(output).build(),
                                EffectDto.builder().type("switch_to_terminal").build()))
                .result("success")
                .build();
    }

    private TransitionResponseDto buildCatResponse(Long currentNodeId, String input) {
        String filename = input.replace("cat", "").trim();

        String output;
        if ("secret.txt".equals(filename)) {
            output = "ACCESS DENIED: Encrypted content\n[REDACTED - clearance level insufficient]";
        } else if (".bashrc".equals(filename)) {
            output =
                    "# ~/.bashrc: executed by bash for non-login shells.\n"
                            + "# see /usr/share/doc/bash/examples/startup-files for examples\n"
                            + "PS1='${debian_chroot:+($debian_chroot)}\\u@\\h:\\w\\$ '";
        } else {
            output = "cat: " + filename + ": No such file or directory";
        }

        return TransitionResponseDto.builder()
                .nextNode(
                        NextNodeDto.builder()
                                .id(currentNodeId + 1)
                                .code("CH1_TERM_05")
                                .nodeType("system")
                                .outputBundle(Map.of("stdout", output))
                                .promptType("command")
                                .isCheckpoint(false)
                                .isTerminal(false)
                                .build())
                .snapshot(Map.of("lastCommand", input, "lastFile", filename))
                .effects(
                        List.of(
                                EffectDto.builder().type("append_output").payload(output).build(),
                                EffectDto.builder().type("switch_to_terminal").build()))
                .result("success")
                .build();
    }
}
