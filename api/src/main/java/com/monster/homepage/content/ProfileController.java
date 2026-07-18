package com.monster.homepage.content;

import com.monster.homepage.common.ApiResponse;
import org.springframework.web.bind.annotation.*;

@RestController
public class ProfileController {

    private final ProfileService service;

    public ProfileController(ProfileService service) {
        this.service = service;
    }

    @GetMapping("/api/profile")
    public ApiResponse<OperationsDtos.FullProfile> getProfile() {
        return ApiResponse.ok(service.getProfile());
    }

    @PutMapping("/api/admin/profile/about")
    public ApiResponse<String> saveAbout(@RequestBody OperationsDtos.ProfileAbout data) {
        service.saveAbout(data);
        return ApiResponse.ok("已保存");
    }

    @PutMapping("/api/admin/profile/resume")
    public ApiResponse<String> saveResume(@RequestBody OperationsDtos.ProfileResume data) {
        service.saveResume(data);
        return ApiResponse.ok("已保存");
    }

    @PutMapping("/api/admin/profile/uses")
    public ApiResponse<String> saveUses(@RequestBody OperationsDtos.ProfileUses data) {
        service.saveUses(data);
        return ApiResponse.ok("已保存");
    }

    @PutMapping("/api/admin/profile/links")
    public ApiResponse<String> saveLinks(@RequestBody OperationsDtos.ProfileLinks data) {
        service.saveLinks(data);
        return ApiResponse.ok("已保存");
    }
}
