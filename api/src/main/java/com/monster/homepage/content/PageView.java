package com.monster.homepage.content;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "page_views")
public class PageView {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String path;

    @Column(name = "visitor_hash", length = 128)
    private String visitorHash;

    @Column(name = "viewed_at", nullable = false)
    private Instant viewedAt;

    @PrePersist
    void onCreate() { if (viewedAt == null) viewedAt = Instant.now(); }

    public void setPath(String path) { this.path = path; }
    public void setVisitorHash(String visitorHash) { this.visitorHash = visitorHash; }
}
