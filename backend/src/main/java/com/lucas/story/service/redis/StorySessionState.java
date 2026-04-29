package com.lucas.story.service.redis;

public record StorySessionState(
    Long userId, String chapterId, String currentNodeId, int stateVersion) {}
