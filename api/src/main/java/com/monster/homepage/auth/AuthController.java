package com.monster.homepage.auth;

import com.monster.homepage.common.ApiResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @GetMapping("/me")
    public ApiResponse<Map<String, Object>> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return ApiResponse.ok(Map.of("authenticated", false));
        }
        return ApiResponse.ok(Map.of("authenticated", true, "username", authentication.getName(), "roles", authentication.getAuthorities().stream().map(a -> a.getAuthority()).toList()));
    }

    @GetMapping("/csrf")
    public ApiResponse<Map<String, String>> csrf(CsrfToken token) {
        return ApiResponse.ok(Map.of("token", token.getToken(), "headerName", token.getHeaderName()));
    }
}
