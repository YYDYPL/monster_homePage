package com.monster.homepage.auth;

import com.monster.homepage.common.ApiResponse;
import com.monster.homepage.content.OperationsDtos.UserItem;
import com.monster.homepage.content.OperationsDtos.UserRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final AdminUserRepository repository;
    private final PasswordEncoder encoder;

    public AdminUserController(AdminUserRepository repository, PasswordEncoder encoder) {
        this.repository = repository;
        this.encoder = encoder;
    }

    @GetMapping
    public ApiResponse<List<UserItem>> list() {
        List<UserItem> users = repository.findAll().stream()
                .map(u -> new UserItem(u.getId(), u.getUsername(), u.getRole(), u.isEnabled(), u.getCreatedAt()))
                .toList();
        return ApiResponse.ok(users);
    }

    @PostMapping
    public ApiResponse<UserItem> create(@Valid @RequestBody UserRequest request) {
        if (repository.findByUsername(request.username()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "用户名已存在");
        }
        if (request.password() == null || request.password().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "密码不能为空");
        }
        AdminUser user = new AdminUser();
        user.setUsername(request.username());
        user.setPasswordHash(encoder.encode(request.password()));
        user.setRole(request.role() != null && !request.role().isBlank() ? request.role() : "ADMIN");
        user.setEnabled(request.enabled() != null ? request.enabled() : true);
        repository.save(user);
        return ApiResponse.ok(new UserItem(user.getId(), user.getUsername(), user.getRole(), user.isEnabled(), user.getCreatedAt()));
    }

    @PatchMapping("/{id}")
    public ApiResponse<UserItem> update(@PathVariable UUID id, @Valid @RequestBody UserRequest request,
                                        Authentication authentication) {
        AdminUser user = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "用户不存在"));
        if (request.username() != null && !request.username().isBlank() && !request.username().equals(user.getUsername())) {
            if (repository.findByUsername(request.username()).isPresent()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "用户名已存在");
            }
            user.setUsername(request.username());
        }
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(encoder.encode(request.password()));
        }
        if (request.role() != null && !request.role().isBlank()) {
            user.setRole(request.role());
        }
        if (request.enabled() != null) {
            // 不能禁用自己
            if (!request.enabled() && authentication.getName().equals(user.getUsername())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "不能禁用当前登录账号");
            }
            user.setEnabled(request.enabled());
        }
        repository.save(user);
        return ApiResponse.ok(new UserItem(user.getId(), user.getUsername(), user.getRole(), user.isEnabled(), user.getCreatedAt()));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<String> delete(@PathVariable UUID id, Authentication authentication) {
        AdminUser user = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "用户不存在"));
        if (authentication.getName().equals(user.getUsername())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "不能删除当前登录账号");
        }
        repository.delete(user);
        return ApiResponse.ok("用户已删除");
    }
}
