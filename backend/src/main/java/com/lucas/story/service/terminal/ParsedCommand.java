package com.lucas.story.service.terminal;

import java.util.List;

public record ParsedCommand(
    String command,
    List<String> args,
    String rawInput
) {}
