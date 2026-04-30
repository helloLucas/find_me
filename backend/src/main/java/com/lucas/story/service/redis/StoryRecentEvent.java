package com.lucas.story.service.redis;

public record StoryRecentEvent(
    String timestamp,
    String actionType,
    String inputValue,
    String inputValueNorm,
    String result,
    String fromNodeId,
    String toNodeId,
    boolean hintRequested,
    String source) {}
