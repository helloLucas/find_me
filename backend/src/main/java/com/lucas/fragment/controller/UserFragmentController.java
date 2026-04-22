package com.lucas.fragment.controller;

import com.lucas.auth.principal.CustomUserPrincipal;
import com.lucas.fragment.service.UserFragmentService;
import com.lucas.global.dto.BaseResponse;
import com.lucas.user.entity.User;
import com.lucas.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/fragments")
@RequiredArgsConstructor
public class UserFragmentController {

    private final UserFragmentService userFragmentService;
    private final UserRepository userRepository;

    @GetMapping("/check/{code}")
    public BaseResponse<Boolean> checkFragment(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @PathVariable String code) {
        boolean exists = userFragmentService.hasFragment(principal.getUserId(), code);
        return BaseResponse.success("Fragment check completed", exists);
    }

    @PostMapping("/acquire/{code}")
    public BaseResponse<Void> acquireFragment(
            @AuthenticationPrincipal CustomUserPrincipal principal,
            @PathVariable String code) {
        User user = userRepository.findById(principal.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        userFragmentService.acquireFragment(user, code);
        return BaseResponse.success("Fragment acquired");
    }
}
