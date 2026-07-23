package com.monster.homepage.ai;

import com.monster.homepage.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/ai")
public class AiController {
    private final AiService ai;

    public AiController(AiService ai) {
        this.ai = ai;
    }

    @GetMapping("/settings")
    public ApiResponse<AiDtos.Settings> settings() {
        return ApiResponse.ok(ai.settings());
    }

    @PatchMapping("/settings")
    public ApiResponse<AiDtos.Settings> updateSettings(@Valid @RequestBody AiDtos.SettingsUpdate request) {
        return ApiResponse.ok(ai.update(request));
    }

    @PostMapping("/test")
    public ApiResponse<AiDtos.TextResult> test(@Valid @RequestBody AiDtos.TestRequest request) {
        return ApiResponse.ok(ai.test(request));
    }

    @PostMapping("/summary")
    public ApiResponse<AiDtos.TextResult> summary(@Valid @RequestBody AiDtos.SummaryRequest request) {
        return ApiResponse.ok(ai.summarize(request));
    }

    @PostMapping("/post-body")
    public ApiResponse<AiDtos.TextResult> postBody(@Valid @RequestBody AiDtos.PostBodyRequest request) {
        return ApiResponse.ok(ai.generatePostBody(request));
    }
}
