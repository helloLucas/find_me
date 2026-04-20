package com.lucas.story.service;

import com.lucas.story.dto.request.TransitionRequestDto;
import com.lucas.story.dto.response.TransitionResponseDto;

public interface StoryService {

    TransitionResponseDto processTransition(TransitionRequestDto request);
}
