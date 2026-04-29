package com.lucas.story.service.terminal;

import java.util.List;
import lombok.Builder;

@Builder
public record TerminalResult(
    List<String> stdout, List<String> stderr, String cwd, String prompt, String resultCode) {}
