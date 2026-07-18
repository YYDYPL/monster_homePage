package com.monster.homepage.content;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class OperationsDtos {
    private OperationsDtos() {}

    public record MediaItem(UUID id, String originalName, String contentType, long sizeBytes, String url, Instant createdAt) {}
    public record MessageItem(UUID id, String name, String email, String subject, String message, ContactMessage.MessageStatus status, Instant createdAt) {}
    public record MessageStatusRequest(ContactMessage.MessageStatus status) {}
    public record AuditLogItem(UUID id, String username, String action, String resourceType, String resourceId, String ipAddress, Instant createdAt) {}
    public record TaxonomyItem(String name, long usageCount) {}
    public record TaxonomySummary(List<TaxonomyItem> tags, List<TaxonomyItem> series, List<TaxonomyItem> categories, List<TaxonomyItem> technologies) {}
    public record TaxonomyRenameRequest(@NotBlank @Size(max = 120) String from, @NotBlank @Size(max = 120) String to) {}

    public record SiteConfig(
            @Size(max = 120) String siteName,
            @Size(max = 300) String siteDescription,
            @Size(max = 120) String ownerName,
            @Size(max = 180) String headline,
            @Size(max = 120) String location,
            @Size(max = 180) String email,
            @Size(max = 500) String githubUrl,
            @Size(max = 500) String linkedinUrl,
            @Size(max = 500) String xUrl,
            @Size(max = 300) String footerText,
            @Size(max = 120) String icpNumber,
            @Size(max = 120) String publicSecurityNumber
    ) {}

    public record PageViewRequest(
            @NotBlank @Size(max = 500) @Pattern(regexp = "^/.*", message = "path must start with /") String path
    ) {}

    public record DailyMetric(String day, long views) {}
    public record PathMetric(String path, long views) {}
    public record AnalyticsSummary(long totalViews, long todayViews, long last7Days, long last30Days,
                                   long uniqueVisitors30Days, List<DailyMetric> daily, List<PathMetric> topPaths) {}

    public record UserItem(UUID id, String username, String role, boolean enabled, Instant createdAt) {}
    public record UserRequest(
            @NotBlank @Size(max = 80) String username,
            @Size(min = 6, max = 128) String password,
            @Size(max = 30) String role,
            Boolean enabled
    ) {}

    public record ProfileAbout(
            String profileName,
            String profileTagline,
            String profileBio,
            String story1,
            String story2,
            List<SkillGroup> skillGroups,
            List<TimelineEntry> timeline
    ) {}
    public record SkillGroup(String title, List<String> items) {}
    public record TimelineEntry(String period, String title, String description) {}

    public record ProfileResume(
            String name, String title, String email, String website, String location,
            String profile, String coreSkills, String engineeringSkills,
            List<ResumeProjectEntry> projects,
            String education, String educationDetail
    ) {}
    public record ResumeProjectEntry(String name, String description, String responsibilities) {}

    public record ProfileUses(List<UseGroup> groups) {}
    public record UseGroup(String title, List<UseItem> items) {}
    public record UseItem(String name, String description) {}

    public record ProfileLinks(List<LinkEntry> links) {}
    public record LinkEntry(String name, String url, String description) {}

    public record FullProfile(ProfileAbout about, ProfileResume resume, ProfileUses uses, ProfileLinks links) {}
}
