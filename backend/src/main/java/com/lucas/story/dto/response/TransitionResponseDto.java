package com.lucas.story.dto.response;

import java.util.List;
import java.util.Map;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class TransitionResponseDto {

    private NextNodeDto nextNode;
    private Map<String, Object> snapshot;
    private List<EffectDto> effects;
    private String result;

    @Getter
    @Builder
    public static class NextNodeDto {
        private Long id;
        private String code;
        private String nodeType;
        private Map<String, Object> outputBundle;
        private String promptType;
        private boolean isCheckpoint;
        private boolean isTerminal;
    }

    @Getter
    @Builder
    public static class EffectDto {
        private String type;
        private Object payload;
    }
}
