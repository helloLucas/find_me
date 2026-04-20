package com.lucas.story.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class TransitionRequestDto {

    @NotBlank(message = "액션 타입은 필수입니다.")
    private String actionType;

    @NotBlank(message = "입력값은 필수입니다.")
    private String inputValue;
}
