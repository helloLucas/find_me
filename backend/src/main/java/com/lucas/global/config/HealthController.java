package com.lucas.global.config;

import com.lucas.global.dto.BaseResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping("/api/v1/health")
    public ResponseEntity<BaseResponse<String>> health() {
        return ResponseEntity.ok(BaseResponse.success("조회 성공", "lucas backend is running"));
    }
}
