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

    @Column(name = "ip_hash", length = 128)
    private String ipHash;

    @Column(length = 80)
    private String browser;

    @Column(length = 80)
    private String device;

    @Column(length = 40)
    private String network;

    @Column(length = 120)
    private String region;

    @Column(name = "viewed_at", nullable = false)
    private Instant viewedAt;

    @PrePersist
    void onCreate() { if (viewedAt == null) viewedAt = Instant.now(); }

    public void setPath(String path) { this.path = path; }
    public void setVisitorHash(String visitorHash) { this.visitorHash = visitorHash; }
    public void setIpHash(String ipHash) { this.ipHash = ipHash; }
    public void setBrowser(String browser) { this.browser = browser; }
    public void setDevice(String device) { this.device = device; }
    public void setNetwork(String network) { this.network = network; }
    public void setRegion(String region) { this.region = region; }
}
