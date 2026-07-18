package com.monster.homepage.content;

import java.util.List;

public final class ContentMapper {
    private ContentMapper() {}

    private static List<String> split(String value) {
        return ContentDtos.split(value);
    }

    public static ContentDtos.PostSummary postSummary(Post post) {
        return new ContentDtos.PostSummary(post.getId(), post.getTitle(), post.getSlug(), post.getSummary(), post.getCoverImageUrl(), split(post.getTagsCsv()), post.getSeries(), post.isFeatured(), post.getStatus(), post.getPublishedAt(), post.getUpdatedAt());
    }

    public static ContentDtos.PostDetail postDetail(Post post) {
        return new ContentDtos.PostDetail(post.getId(), post.getTitle(), post.getSlug(), post.getSummary(), post.getContent(), post.getCoverImageUrl(), split(post.getTagsCsv()), post.getSeries(), post.isFeatured(), post.getStatus(), post.getPublishedAt(), post.getCreatedAt(), post.getUpdatedAt());
    }

    public static ContentDtos.NoteSummary noteSummary(Note note) {
        return new ContentDtos.NoteSummary(note.getId(), note.getTitle(), note.getSlug(), note.getSummary(), note.getCategory(), split(note.getTagsCsv()), note.getStatus(), note.getParentId(), note.getSortOrder(), note.getPublishedAt(), note.getUpdatedAt());
    }

    public static ContentDtos.NoteDetail noteDetail(Note note) {
        return new ContentDtos.NoteDetail(note.getId(), note.getTitle(), note.getSlug(), note.getSummary(), note.getContent(), note.getCategory(), split(note.getTagsCsv()), note.getStatus(), note.getParentId(), note.getSortOrder(), note.getPublishedAt(), note.getCreatedAt(), note.getUpdatedAt());
    }

    public static ContentDtos.ProjectSummary projectSummary(Project project) {
        return new ContentDtos.ProjectSummary(project.getId(), project.getName(), project.getSlug(), project.getSummary(), String.join(", ", split(project.getTechStackCsv())), project.getStatus(), project.getRepoUrl(), project.getDemoUrl(), project.getImageUrl(), project.isFeatured(), project.getStartDate(), project.getEndDate());
    }

    public static ContentDtos.ProjectDetail projectDetail(Project project) {
        return new ContentDtos.ProjectDetail(project.getId(), project.getName(), project.getSlug(), project.getSummary(), project.getDescription(), String.join(", ", split(project.getTechStackCsv())), project.getStatus(), project.getRepoUrl(), project.getDemoUrl(), project.getImageUrl(), project.isFeatured(), project.getStartDate(), project.getEndDate(), project.getCreatedAt(), project.getUpdatedAt());
    }
}