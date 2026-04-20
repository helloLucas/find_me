package com.lucas.story.controller;

import com.lucas.global.dto.BaseResponse;
import com.lucas.story.dto.request.TransitionRequestDto;
import com.lucas.story.dto.response.TransitionResponseDto;
import com.lucas.story.service.StoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/story")
@RequiredArgsConstructor
public class StoryController {

    private final StoryService storyService;

    @PostMapping("/transitions")
    public ResponseEntity<BaseResponse<TransitionResponseDto>> processTransition(
            @Valid @RequestBody TransitionRequestDto request) {

        TransitionResponseDto response = storyService.processTransition(request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(BaseResponse.success("상태 전이 성공", response));
    }
}
