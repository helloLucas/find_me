package com.lucas.global.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class BaseResponse<T> {

    private final String code;
    private final String message;
    private final T data;

    private BaseResponse(String code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    public static <T> BaseResponse<T> success(String message, T data) {
        return new BaseResponse<>(null, message, data);
    }

    public static BaseResponse<Void> success(String message) {
        return new BaseResponse<>(null, message, null);
    }

    public static BaseResponse<Void> fail(String code, String message) {
        return new BaseResponse<>(code, message, null);
    }
}
