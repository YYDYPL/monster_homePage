package com.monster.homepage.content;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notes")
public class Note {
    @Id
    private UUID id;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(nullable = false, unique = true, length = 180)
    private String slug;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(length = 80)
    private String category;

    @Column(name = "tags_csv", columnDefinition = "TEXT")
    private String tagsCsv;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ContentStatus status = ContentStatus.DRAFT;

    @Column(name = "parent_id")
    private UUID parentId;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public String getTitle() { return title; }
    public void setTitle(String value) { title = value; }
    public String getSlug() { return slug; }
    public void setSlug(String value) { slug = value; }
    public String getSummary() { return summary; }
    public void setSummary(String value) { summary = value; }
    public String getContent() { return content; }
    public void setContent(String value) { content = value; }
    public String getCategory() { return category; }
    public void setCategory(String value) { category = value; }
    public String getTagsCsv() { return tagsCsv; }
    public void setTagsCsv(String value) { tagsCsv = value; }
    public ContentStatus getStatus() { return status; }
    public void setStatus(ContentStatus value) { status = value; }
    public UUID getParentId() { return parentId; }
    public void setParentId(UUID value) { parentId = value; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int value) { sortOrder = value; }
    public Instant getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Instant value) { publishedAt = value; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}