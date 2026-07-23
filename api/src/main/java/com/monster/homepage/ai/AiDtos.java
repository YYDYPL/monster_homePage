package com.monster.homepage.ai;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class AiDtos {
    private AiDtos() {}

    public enum ContentType {
        POST,
        NOTE,
        PROJECT
    }

    public record Settings(
            String baseUrl,
            String model,
            boolean apiKeyConfigured
    ) {}

    public record SettingsUpdate(
            @NotBlank @Size(max = 1000) String baseUrl,
            @NotBlank @Size(max = 200) String model,
            @Size(max = 2048) String apiKey,
            boolean clearApiKey
    ) {}

    public record TestRequest(
            @Size(max = 1000) String baseUrl,
            @Size(max = 200) String model,
            @Size(max = 2048) String apiKey
    ) {}

    public record SummaryRequest(
            @NotNull ContentType contentType,
            @Size(max = 180) String title,
            @NotBlank @Size(max = 100000) String content
    ) {}

    public record PostBodyRequest(
            @Size(max = 180) String title,
            @NotBlank @Size(max = 4000) String prompt
    ) {}

    public record TextResult(String text) {}
}
