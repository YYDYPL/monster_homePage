package com.monster.homepage.content;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

public final class ContentDtos {
    private ContentDtos() {}

    public record PostSummary(UUID id, String title, String slug, String summary, String coverImageUrl, List<String> tags, String series, boolean featured, ContentStatus status, Instant publishedAt, Instant updatedAt) {}
    public record PostDetail(UUID id, String title, String slug, String summary, String content, String coverImageUrl, List<String> tags, String series, boolean featured, ContentStatus status, Instant publishedAt, Instant createdAt, Instant updatedAt) {}

    public record NoteSummary(UUID id, String title, String slug, String summary, String category, List<String> tags, ContentStatus status, UUID parentId, int sortOrder, Instant publishedAt, Instant updatedAt) {}
    public record NoteDetail(UUID id, String title, String slug, String summary, String content, String category, List<String> tags, ContentStatus status, UUID parentId, int sortOrder, Instant publishedAt, Instant createdAt, Instant updatedAt) {}
    public record NoteTreeNode(UUID id, String title, String slug, String summary, String category, ContentStatus status, UUID parentId, int sortOrder, Instant updatedAt, List<NoteTreeNode> children) {}

    public record ProjectSummary(UUID id, String name, String slug, String summary, String techStack, ProjectStatus status, String repoUrl, String demoUrl, String imageUrl, boolean featured, LocalDate startDate, LocalDate endDate) {}
    public record ProjectDetail(UUID id, String name, String slug, String summary, String description, String techStack, ProjectStatus status, String repoUrl, String demoUrl, String imageUrl, boolean featured, LocalDate startDate, LocalDate endDate, Instant createdAt, Instant updatedAt) {}

    public record PostRequest(@NotBlank @Size(max = 180) String title, @Size(max = 180) String slug, @Size(max = 500) String summary, @NotBlank String content, String coverImageUrl, List<String> tags, @Size(max = 120) String series, ContentStatus status, boolean featured) {}
    public record NoteRequest(@NotBlank @Size(max = 180) String title, @Size(max = 180) String slug, @Size(max = 500) String summary, @NotBlank String content, @Size(max = 80) String category, List<String> tags, ContentStatus status, UUID parentId, @Min(0) Integer sortOrder) {}
    public record NoteMoveRequest(UUID parentId, @Min(0) int position) {}
    public record ProjectRequest(@NotBlank @Size(max = 180) String name, @Size(max = 180) String slug, @Size(max = 500) String summary, String description, List<String> techStack, ProjectStatus status, String repoUrl, String demoUrl, String imageUrl, boolean featured, LocalDate startDate, LocalDate endDate) {}
    public record ContactRequest(@NotBlank @Size(max = 120) String name, @NotBlank @Email String email, @NotBlank @Size(max = 180) String subject, @NotBlank @Size(max = 5000) String message) {}
    public record SearchResult(String type, String title, String slug, String summary, String href) {}
    public record Dashboard(long posts, long notes, long projects, long messages) {}

    public static List<String> split(String csv) {
        if (csv == null || csv.isBlank()) return List.of();
        return Arrays.stream(csv.split(",")).map(String::trim).filter(value -> !value.isBlank()).distinct().toList();
    }

    public static String join(List<String> values) {
        if (values == null || values.isEmpty()) return null;
        return values.stream().map(String::trim).filter(value -> !value.isBlank()).distinct().reduce((left, right) -> left + "," + right).orElse(null);
    }
}